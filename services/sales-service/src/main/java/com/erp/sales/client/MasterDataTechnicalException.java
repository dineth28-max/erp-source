package com.erp.sales.client;

/**
 * master-data-service is unreachable, erroring, or timing out. Counts toward
 * the circuit breaker's failure rate and is eligible for retry.
 */
public class MasterDataTechnicalException extends RuntimeException {
    public MasterDataTechnicalException(String message) {
        super(message);
    }
}
