package com.erp.reporting.repository;

import com.erp.reporting.domain.RevenueSummary;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RevenueSummaryRepository extends JpaRepository<RevenueSummary, UUID> {
    Optional<RevenueSummary> findByTenantIdAndYearMonth(UUID tenantId, String yearMonth);
    List<RevenueSummary> findByTenantIdOrderByYearMonthAsc(UUID tenantId);
}
