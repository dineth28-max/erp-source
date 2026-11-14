package com.erp.inventory.web.dto;

import java.math.BigDecimal;

/** Tenant-wide stock counters for the dashboard, computed with COUNT queries. */
public record StockSummaryResponse(
        long totalItems,
        long outOfStock,
        long lowStock,
        BigDecimal lowStockThreshold
) {
}
