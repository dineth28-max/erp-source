package com.erp.inventory.repository;

import com.erp.inventory.domain.Warehouse;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface WarehouseRepository extends JpaRepository<Warehouse, UUID> {
    Optional<Warehouse> findByTenantIdAndCode(UUID tenantId, String code);
}
