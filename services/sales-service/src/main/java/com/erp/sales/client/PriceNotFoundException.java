package com.erp.sales.client;

/**
 * master-data-service has no price configured for the item - a real business
 * rejection (the order can't be priced), not a sign master-data-service is
 * unhealthy. Excluded from Resilience4j retry/circuit-breaker failure
 * counting for the same reason InventoryBusinessException is.
 */
public class PriceNotFoundException extends RuntimeException {
    public PriceNotFoundException(String message) {
        super(message);
    }
}
