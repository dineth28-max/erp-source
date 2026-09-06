package com.erp.procurement.messaging;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ProcurementEvent(
        String eventType,
        UUID tenantId,
        UUID purchaseOrderId,
        UUID vendorId,
        BigDecimal totalAmount,
        String reason,
        Instant occurredAt
) {
    public static ProcurementEvent submitted(UUID tenantId, UUID poId, UUID vendorId, BigDecimal totalAmount) {
        return new ProcurementEvent("PurchaseOrderSubmitted", tenantId, poId, vendorId, totalAmount, null, Instant.now());
    }

    public static ProcurementEvent received(UUID tenantId, UUID poId, UUID vendorId, BigDecimal totalAmount) {
        return new ProcurementEvent("PurchaseOrderReceived", tenantId, poId, vendorId, totalAmount, null, Instant.now());
    }
}
