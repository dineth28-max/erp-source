package com.erp.sales.client;

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
 * Resolves the authoritative price for an item from master-data-service.
 * sales-service must never trust a client-supplied unitPrice - see the
 * comment on CreateOrderLineRequest.
 */
@Component
public class MasterDataClient {

    private static final Logger log = LoggerFactory.getLogger(MasterDataClient.class);
    private static final String INSTANCE = "masterdata";

    private final WebClient webClient;
    private final CircuitBreaker circuitBreaker;
    private final Retry retry;
    private final TimeLimiter timeLimiter;

    public MasterDataClient(WebClient.Builder builder,
                             @Value("${app.master-data-service.base-url}") String baseUrl,
                             CircuitBreakerRegistry circuitBreakerRegistry,
                             RetryRegistry retryRegistry,
                             TimeLimiterRegistry timeLimiterRegistry) {
        this.webClient = builder.baseUrl(baseUrl).build();
        this.circuitBreaker = circuitBreakerRegistry.circuitBreaker(INSTANCE);
        this.retry = retryRegistry.retry(INSTANCE);
        this.timeLimiter = timeLimiterRegistry.timeLimiter(INSTANCE);
    }

    /**
     * @throws PriceNotFoundException no price configured for this item (business rejection)
     * @throws MasterDataTechnicalException master-data-service unavailable/erroring after retries
     */
    public BigDecimal resolvePrice(UUID tenantId, UUID userId, UUID itemId) {
        Mono<PriceResponseBody> request = webClient.get()
                .uri("/api/v1/prices/{itemId}", itemId)
                .header("X-Tenant-Id", tenantId.toString())
                .header("X-User-Id", userId.toString())
                .retrieve()
                .onStatus(status -> status.value() == 404,
                        resp -> Mono.error(new PriceNotFoundException("No price configured for item: " + itemId)))
                .onStatus(status -> status.value() >= 400 && status.value() != 404,
                        resp -> resp.bodyToMono(String.class)
                                .defaultIfEmpty("master-data-service rejected the request")
                                .flatMap(body -> Mono.error(new MasterDataTechnicalException(body))))
                .onStatus(status -> status.value() >= 500,
                        resp -> resp.bodyToMono(String.class)
                                .defaultIfEmpty("master-data-service error")
                                .flatMap(body -> Mono.error(new MasterDataTechnicalException(body))))
                .bodyToMono(PriceResponseBody.class)
                .transformDeferred(TimeLimiterOperator.of(timeLimiter))
                .transformDeferred(CircuitBreakerOperator.of(circuitBreaker))
                .transformDeferred(RetryOperator.of(retry));

        try {
            PriceResponseBody body = request.block();
            return body.unitPrice();
        } catch (PriceNotFoundException e) {
            throw e;
        } catch (CallNotPermittedException e) {
            log.warn("Master-data circuit breaker OPEN, failing fast for item {}", itemId);
            throw new MasterDataTechnicalException("Pricing service temporarily unavailable, please retry shortly");
        } catch (Exception e) {
            log.error("Master-data price lookup failed for item {}: {}", itemId, e.getMessage(), e);
            throw new MasterDataTechnicalException("Pricing service call failed: " + e.getMessage());
        }
    }
}
