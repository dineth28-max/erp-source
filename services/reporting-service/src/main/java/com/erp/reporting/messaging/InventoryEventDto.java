package com.erp.reporting.messaging;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

// Local mirror of inventory-service's InventoryEvent record - see SalesEventDto.
public record InventoryEventDto(
        String eventType,
        UUID tenantId,
        UUID itemId,
        UUID warehouseId,
        String referenceId,
        BigDecimal quantity,
        String reason,
        Instant occurredAt
) {
}
