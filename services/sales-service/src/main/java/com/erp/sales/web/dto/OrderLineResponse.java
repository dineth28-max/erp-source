package com.erp.sales.web.dto;

import com.erp.sales.domain.OrderLine;

import java.math.BigDecimal;
import java.util.UUID;

public record OrderLineResponse(UUID itemId, BigDecimal quantity, BigDecimal unitPrice, BigDecimal lineTotal) {
    public static OrderLineResponse from(OrderLine line) {
        return new OrderLineResponse(line.getItemId(), line.getQuantity(), line.getUnitPrice(), line.getLineTotal());
    }
}
