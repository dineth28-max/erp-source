package com.erp.sales.client;

/**
 * inventory-service is unreachable, erroring, or timing out. Counts toward
 * the circuit breaker's failure rate and is eligible for retry.
 */
public class InventoryTechnicalException extends RuntimeException {
    public InventoryTechnicalException(String message) {
        super(message);
    }

    public InventoryTechnicalException(String message, Throwable cause) {
        super(message, cause);
    }
}
