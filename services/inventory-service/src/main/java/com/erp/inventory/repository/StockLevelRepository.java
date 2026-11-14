package com.erp.inventory.repository;

import com.erp.inventory.domain.StockLevel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StockLevelRepository extends JpaRepository<StockLevel, UUID> {

    List<StockLevel> findByTenantIdAndItemId(UUID tenantId, UUID itemId);

    Optional<StockLevel> findByTenantIdAndItemIdAndWarehouseId(UUID tenantId, UUID itemId, UUID warehouseId);

    // Dashboard counters are computed in the database (one COUNT each) instead
    // of the browser fetching every item's stock record one request at a time.
    @Query("select count(s) from StockLevel s where s.tenantId = :tenantId and s.warehouseId = :warehouseId "
            + "and s.quantityOnHand - s.quantityReserved <= 0")
    long countOutOfStock(@Param("tenantId") UUID tenantId, @Param("warehouseId") UUID warehouseId);

    @Query("select count(s) from StockLevel s where s.tenantId = :tenantId and s.warehouseId = :warehouseId "
            + "and s.quantityOnHand - s.quantityReserved > 0 "
            + "and s.quantityOnHand - s.quantityReserved <= :threshold")
    long countLowStock(@Param("tenantId") UUID tenantId, @Param("warehouseId") UUID warehouseId,
                       @Param("threshold") BigDecimal threshold);
}
