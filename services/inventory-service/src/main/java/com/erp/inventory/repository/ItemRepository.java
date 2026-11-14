package com.erp.inventory.repository;

import com.erp.inventory.domain.Item;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ItemRepository extends JpaRepository<Item, UUID> {
    Page<Item> findByTenantId(UUID tenantId, Pageable pageable);
    Optional<Item> findByIdAndTenantId(UUID id, UUID tenantId);
    boolean existsByTenantIdAndSku(UUID tenantId, String sku);

    long countByTenantId(UUID tenantId);
}
