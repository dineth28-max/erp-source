package com.erp.procurement.client;

public record StockReceiveResult(boolean success, String failureReason) {
    public static StockReceiveResult succeeded() {
        return new StockReceiveResult(true, null);
    }

    public static StockReceiveResult failure(String reason) {
        return new StockReceiveResult(false, reason);
    }
}
