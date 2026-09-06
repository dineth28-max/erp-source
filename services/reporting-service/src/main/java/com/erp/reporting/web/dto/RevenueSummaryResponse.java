package com.erp.reporting.web.dto;

import com.erp.reporting.domain.RevenueSummary;

import java.math.BigDecimal;

public record RevenueSummaryResponse(String yearMonth, int confirmedOrders, BigDecimal confirmedRevenue, int failedOrders) {
    public static RevenueSummaryResponse from(RevenueSummary s) {
        return new RevenueSummaryResponse(s.getYearMonth(), s.getConfirmedOrders(), s.getConfirmedRevenue(), s.getFailedOrders());
    }
}
