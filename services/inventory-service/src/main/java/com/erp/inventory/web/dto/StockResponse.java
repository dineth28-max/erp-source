package com.erp.inventory.web.dto;

import com.erp.inventory.domain.StockLevel;

import java.math.BigDecimal;
import java.util.UUID;

public record StockResponse(
        UUID itemId,
        UUID warehouseId,
        BigDecimal quantityOnHand,
        BigDecimal quantityReserved,
        BigDecimal quantityAvailable
) {
    public static StockResponse from(StockLevel s) {
        return new StockResponse(s.getItemId(), s.getWarehouseId(), s.getQuantityOnHand(), s.getQuantityReserved(), s.quantityAvailable());
    }
}
