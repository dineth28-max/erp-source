package com.erp.reporting.web.dto;

import com.erp.reporting.domain.InventoryEventLog;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record InventoryEventResponse(
        UUID id,
        String eventType,
        UUID itemId,
        UUID warehouseId,
        String referenceId,
        BigDecimal quantity,
        String reason,
        Instant occurredAt
) {
    public static InventoryEventResponse from(InventoryEventLog e) {
        return new InventoryEventResponse(
                e.getId(), e.getEventType(), e.getItemId(), e.getWarehouseId(),
                e.getReferenceId(), e.getQuantity(), e.getReason(), e.getOccurredAt()
        );
    }
}
