package com.erp.finance.messaging;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

// Local mirror of procurement-service's ProcurementEvent.
public record ProcurementEventDto(
        String eventType,
        UUID tenantId,
        UUID purchaseOrderId,
        UUID vendorId,
        BigDecimal totalAmount,
        String reason,
        Instant occurredAt
) {
}
