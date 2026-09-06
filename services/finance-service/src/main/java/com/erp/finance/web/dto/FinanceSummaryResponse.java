package com.erp.finance.web.dto;

import java.math.BigDecimal;

public record FinanceSummaryResponse(
        BigDecimal revenue,
        BigDecimal accountsReceivable,
        BigDecimal accountsPayable,
        BigDecimal inventoryValue
) {
}
