package com.erp.reporting.repository;

import com.erp.reporting.domain.InventoryEventLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface InventoryEventLogRepository extends JpaRepository<InventoryEventLog, UUID> {
    Page<InventoryEventLog> findByTenantIdOrderByOccurredAtDesc(UUID tenantId, Pageable pageable);
}
