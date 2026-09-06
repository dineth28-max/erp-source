package com.erp.inventory.repository;

import com.erp.inventory.domain.StockLevel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StockLevelRepository extends JpaRepository<StockLevel, UUID> {

    List<StockLevel> findByTenantIdAndItemId(UUID tenantId, UUID itemId);

    Optional<StockLevel> findByTenantIdAndItemIdAndWarehouseId(UUID tenantId, UUID itemId, UUID warehouseId);
}
