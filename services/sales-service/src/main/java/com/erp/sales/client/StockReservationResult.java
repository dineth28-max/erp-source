package com.erp.sales.client;

public record StockReservationResult(boolean success, String failureReason) {
    public static StockReservationResult succeeded() {
        return new StockReservationResult(true, null);
    }

    public static StockReservationResult failure(String reason) {
        return new StockReservationResult(false, reason);
    }
}
