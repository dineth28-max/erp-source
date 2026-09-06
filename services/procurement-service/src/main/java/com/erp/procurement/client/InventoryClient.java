package com.erp.procurement.client;

import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.reactor.circuitbreaker.operator.CircuitBreakerOperator;
import io.github.resilience4j.reactor.retry.RetryOperator;
import io.github.resilience4j.reactor.timelimiter.TimeLimiterOperator;
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryRegistry;
import io.github.resilience4j.timelimiter.TimeLimiter;
import io.github.resilience4j.timelimiter.TimeLimiterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Calls inventory-service's /stock/receive endpoint to add received quantity
 * back into stock - the procurement-side counterpart of sales-service's
 * InventoryClient (which reserves/releases). Same resilience shape
 * deliberately: TimeLimiter innermost, CircuitBreaker next, Retry outermost -
 * see the comment in sales-service's InventoryClient for why that order
 * matters (an earlier version of this code got it backwards there).
 */
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

    public StockReceiveResult receive(UUID tenantId, UUID userId, UUID itemId, BigDecimal quantity, String referenceId) {
        Mono<Void> request = webClient.post()
                .uri("/api/v1/stock/receive")
                .header("X-Tenant-Id", tenantId.toString())
                .header("X-User-Id", userId.toString())
                .bodyValue(new ReceiveStockRequestBody(itemId, quantity, referenceId))
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
                .transformDeferred(TimeLimiterOperator.of(timeLimiter))
                .transformDeferred(CircuitBreakerOperator.of(circuitBreaker))
                .transformDeferred(RetryOperator.of(retry));

        try {
            request.block();
            return StockReceiveResult.succeeded();
        } catch (InventoryBusinessException e) {
            return StockReceiveResult.failure(e.getMessage());
        } catch (CallNotPermittedException e) {
            log.warn("Inventory circuit breaker OPEN, failing fast for item {}", itemId);
            return StockReceiveResult.failure("Inventory service temporarily unavailable, please retry shortly");
        } catch (Exception e) {
            log.error("Inventory receive call failed for item {}: {}", itemId, e.getMessage(), e);
            return StockReceiveResult.failure("Inventory service call failed: " + e.getMessage());
        }
    }
}
