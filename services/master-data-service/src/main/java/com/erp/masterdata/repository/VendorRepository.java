package com.erp.masterdata.repository;

import com.erp.masterdata.domain.Vendor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface VendorRepository extends JpaRepository<Vendor, UUID> {
    Optional<Vendor> findByIdAndTenantId(UUID id, UUID tenantId);
    Page<Vendor> findByTenantId(UUID tenantId, Pageable pageable);
}
