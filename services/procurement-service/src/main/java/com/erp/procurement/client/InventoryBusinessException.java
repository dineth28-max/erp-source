package com.erp.procurement.client;

/**
 * inventory-service rejected the receive request as a genuine business
 * outcome (e.g. unknown item), not because it's unhealthy. Excluded from
 * Resilience4j retry/circuit-breaker failure counting for the same reason as
 * sales-service's InventoryBusinessException.
 */
public class InventoryBusinessException extends RuntimeException {
    public InventoryBusinessException(String message) {
        super(message);
    }
}
