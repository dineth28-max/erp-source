package com.erp.masterdata.web.dto;

import com.erp.masterdata.domain.PriceListEntry;

import java.math.BigDecimal;
import java.util.UUID;

public record PriceResponse(UUID itemId, BigDecimal unitPrice) {
    public static PriceResponse from(PriceListEntry entry) {
        return new PriceResponse(entry.getItemId(), entry.getUnitPrice());
    }
}
