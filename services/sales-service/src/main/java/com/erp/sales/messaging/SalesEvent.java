package com.erp.sales.messaging;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record SalesEvent(
        String eventType,
        UUID tenantId,
        UUID orderId,
        UUID customerId,
        BigDecimal totalAmount,
        String reason,
        Instant occurredAt
) {
    public static SalesEvent placed(UUID tenantId, UUID orderId, UUID customerId, BigDecimal totalAmount) {
        return new SalesEvent("OrderPlaced", tenantId, orderId, customerId, totalAmount, null, Instant.now());
    }

    public static SalesEvent failed(UUID tenantId, UUID orderId, UUID customerId, String reason) {
        return new SalesEvent("OrderFailed", tenantId, orderId, customerId, BigDecimal.ZERO, reason, Instant.now());
    }
}
