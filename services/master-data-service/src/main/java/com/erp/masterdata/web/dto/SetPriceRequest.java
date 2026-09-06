package com.erp.masterdata.web.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record SetPriceRequest(@NotNull UUID itemId, @NotNull @DecimalMin(value = "0.0") BigDecimal unitPrice) {
}
