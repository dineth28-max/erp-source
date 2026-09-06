package com.erp.sales.web.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

// unitPrice is deliberately absent: sales-service resolves the authoritative
// price from master-data-service (see MasterDataClient) rather than trusting
// whatever the caller sends - otherwise a client could charge any price it wants.
public record CreateOrderLineRequest(
        @NotNull UUID itemId,
        @NotNull @DecimalMin(value = "0.0", inclusive = false) BigDecimal quantity
) {
}
