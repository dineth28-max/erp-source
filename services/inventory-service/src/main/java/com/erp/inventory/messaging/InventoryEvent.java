package com.erp.inventory.messaging;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record InventoryEvent(
        String eventType,
        UUID tenantId,
        UUID itemId,
        UUID warehouseId,
        String referenceId,
        BigDecimal quantity,
        String reason,
        Instant occurredAt
) {
    public static InventoryEvent reserved(UUID tenantId, UUID itemId, UUID warehouseId, String referenceId, BigDecimal quantity) {
        return new InventoryEvent("StockReserved", tenantId, itemId, warehouseId, referenceId, quantity, null, Instant.now());
    }

    public static InventoryEvent reservationFailed(UUID tenantId, UUID itemId, UUID warehouseId, String referenceId, BigDecimal quantity, String reason) {
        return new InventoryEvent("StockReservationFailed", tenantId, itemId, warehouseId, referenceId, quantity, reason, Instant.now());
    }

    public static InventoryEvent released(UUID tenantId, UUID itemId, UUID warehouseId, String referenceId, BigDecimal quantity) {
        return new InventoryEvent("StockReleased", tenantId, itemId, warehouseId, referenceId, quantity, null, Instant.now());
    }

    public static InventoryEvent confirmed(UUID tenantId, UUID itemId, UUID warehouseId, String referenceId, BigDecimal quantity) {
        return new InventoryEvent("StockConfirmed", tenantId, itemId, warehouseId, referenceId, quantity, null, Instant.now());
    }

    public static InventoryEvent received(UUID tenantId, UUID itemId, UUID warehouseId, String referenceId, BigDecimal quantity) {
        return new InventoryEvent("StockReceived", tenantId, itemId, warehouseId, referenceId, quantity, null, Instant.now());
    }
}
