package com.erp.finance.messaging;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

// Local mirror of sales-service's SalesEvent - see reporting-service's
// identical DTO for why this isn't a shared class across services.
public record SalesEventDto(
        String eventType,
        UUID tenantId,
        UUID orderId,
        UUID customerId,
        BigDecimal totalAmount,
        String reason,
        Instant occurredAt
) {
}
