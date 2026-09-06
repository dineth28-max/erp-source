package com.erp.masterdata.repository;

import com.erp.masterdata.domain.PriceListEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PriceListEntryRepository extends JpaRepository<PriceListEntry, UUID> {
    Optional<PriceListEntry> findByTenantIdAndItemId(UUID tenantId, UUID itemId);
}
