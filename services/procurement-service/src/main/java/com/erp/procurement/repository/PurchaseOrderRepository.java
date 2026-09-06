package com.erp.procurement.repository;

import com.erp.procurement.domain.PurchaseOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, UUID> {

    // Lines are LAZY and open-in-view is disabled - the detail view must fetch
    // them inside the same transaction via JOIN FETCH (see sales-service's
    // OrderRepository for the same pattern and the same reasoning).
    @Query("select po from PurchaseOrder po left join fetch po.lines where po.id = :id and po.tenantId = :tenantId")
    Optional<PurchaseOrder> findByIdAndTenantIdFetchLines(UUID id, UUID tenantId);

    Page<PurchaseOrder> findByTenantId(UUID tenantId, Pageable pageable);
}
