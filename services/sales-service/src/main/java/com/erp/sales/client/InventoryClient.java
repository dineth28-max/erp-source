package com.erp.sales.client;

import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.reactor.circuitbreaker.operator.CircuitBreakerOperator;
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryRegistry;
import io.github.resilience4j.reactor.retry.RetryOperator;
import io.github.resilience4j.timelimiter.TimeLimiter;
import io.github.resilience4j.timelimiter.TimeLimiterRegistry;
import io.github.resilience4j.reactor.timelimiter.TimeLimiterOperator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.UUID;

@Component
public class InventoryClient {

    private static final Logger log = LoggerFactory.getLogger(InventoryClient.class);
    private static final String INSTANCE = "inventory";

    private final WebClient webClient;
    private final CircuitBreaker circuitBreaker;
    private final Retry retry;
    private final TimeLimiter timeLimiter;

    public InventoryClient(WebClient.Builder builder,
                            @Value("${app.inventory-service.base-url}") String baseUrl,
                            CircuitBreakerRegistry circuitBreakerRegistry,
                            RetryRegistry retryRegistry,
                            TimeLimiterRegistry timeLimiterRegistry) {
        this.webClient = builder.baseUrl(baseUrl).build();
        this.circuitBreaker = circuitBreakerRegistry.circuitBreaker(INSTANCE);
        this.retry = retryRegistry.retry(INSTANCE);
        this.timeLimiter = timeLimiterRegistry.timeLimiter(INSTANCE);
    }

    public StockReservationResult reserve(UUID tenantId, UUID userId, UUID itemId, BigDecimal quantity, String referenceId) {
        return call("reserve", tenantId, userId, itemId, quantity, referenceId);
    }

    public StockReservationResult release(UUID tenantId, UUID userId, UUID itemId, BigDecimal quantity, String referenceId) {
        return call("release", tenantId, userId, itemId, quantity, referenceId);
    }

    private StockReservationResult call(String action, UUID tenantId, UUID userId, UUID itemId, BigDecimal quantity, String referenceId) {
        Mono<Void> request = webClient.post()
                .uri("/api/v1/stock/{action}", action)
                .header("X-Tenant-Id", tenantId.toString())
                .header("X-User-Id", userId.toString())
                .bodyValue(new ReserveStockRequestBody(itemId, quantity, referenceId))
                .retrieve()
                .onStatus(status -> status.value() >= 400 && status.value() < 500,
                        resp -> resp.bodyToMono(String.class)
                                .defaultIfEmpty("Inventory service rejected the request")
                                .flatMap(body -> Mono.error(new InventoryBusinessException(body))))
                .onStatus(status -> status.value() >= 500,
                        resp -> resp.bodyToMono(String.class)
                                .defaultIfEmpty("Inventory service error")
                                .flatMap(body -> Mono.error(new InventoryTechnicalException(body))))
                .bodyToMono(Void.class)
                // Order matters: TimeLimiter must be innermost so it bounds a single
                // attempt, CircuitBreaker next so each attempt counts individually
                // towards the failure rate, and Retry outermost so it re-issues a
                // fresh attempt (with its own fresh time budget) on failure. Putting
                // TimeLimiter outermost (as an earlier version of this code did)
                // makes it bound the *entire* retry sequence instead of one call,
                // which produces spurious timeouts under normal retry/backoff.
                .transformDeferred(TimeLimiterOperator.of(timeLimiter))
                .transformDeferred(CircuitBreakerOperator.of(circuitBreaker))
                .transformDeferred(RetryOperator.of(retry));

        try {
            request.block();
            return StockReservationResult.succeeded();
        } catch (InventoryBusinessException e) {
            return StockReservationResult.failure(e.getMessage());
        } catch (CallNotPermittedException e) {
            log.warn("Inventory circuit breaker OPEN, failing fast for item {}", itemId);
            return StockReservationResult.failure("Inventory service temporarily unavailable, please retry shortly");
        } catch (Exception e) {
            log.error("Inventory {} call failed for item {}: {}", action, itemId, e.getMessage(), e);
            return StockReservationResult.failure("Inventory service call failed: " + e.getMessage());
        }
    }
}
