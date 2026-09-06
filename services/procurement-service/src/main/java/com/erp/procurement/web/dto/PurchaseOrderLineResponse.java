package com.erp.procurement.web.dto;

import com.erp.procurement.domain.PurchaseOrderLine;

import java.math.BigDecimal;
import java.util.UUID;

public record PurchaseOrderLineResponse(UUID itemId, BigDecimal quantity, BigDecimal unitCost, BigDecimal lineTotal) {
    public static PurchaseOrderLineResponse from(PurchaseOrderLine line) {
        return new PurchaseOrderLineResponse(line.getItemId(), line.getQuantity(), line.getUnitCost(), line.getLineTotal());
    }
}
