package com.erp.inventory.repository;

import com.erp.inventory.domain.StockReceipt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface StockReceiptRepository extends JpaRepository<StockReceipt, UUID> {
    Optional<StockReceipt> findByTenantIdAndItemIdAndReferenceId(UUID tenantId, UUID itemId, String referenceId);
}
