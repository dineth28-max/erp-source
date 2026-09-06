package com.erp.inventory.repository;

import com.erp.inventory.domain.StockReservation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface StockReservationRepository extends JpaRepository<StockReservation, UUID> {
    Optional<StockReservation> findByTenantIdAndItemIdAndReferenceId(UUID tenantId, UUID itemId, String referenceId);
}
