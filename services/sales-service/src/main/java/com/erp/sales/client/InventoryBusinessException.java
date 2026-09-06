package com.erp.sales.client;

/**
 * A rejection from inventory-service that reflects a real business outcome
 * (e.g. insufficient stock) rather than the service being unavailable or
 * misbehaving. Deliberately excluded from Resilience4j retry/circuit-breaker
 * failure counting - retrying "out of stock" will not make stock appear, and
 * counting it as a fault would trip the breaker for a perfectly healthy
 * inventory-service.
 */
public class InventoryBusinessException extends RuntimeException {
    public InventoryBusinessException(String message) {
        super(message);
    }
}
