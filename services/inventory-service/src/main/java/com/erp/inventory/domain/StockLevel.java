package com.erp.inventory.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "stock_levels")
@Getter
@Setter
@NoArgsConstructor
public class StockLevel {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "item_id", nullable = false)
    private UUID itemId;

    @Column(name = "warehouse_id", nullable = false)
    private UUID warehouseId;

    @Column(name = "quantity_on_hand", nullable = false)
    private BigDecimal quantityOnHand;

    @Column(name = "quantity_reserved", nullable = false)
    private BigDecimal quantityReserved;

    // Optimistic locking: under concurrent reservation attempts on the same
    // stock row (expected at 5000-user scale), Hibernate raises
    // ObjectOptimisticLockingFailureException instead of letting a lost update
    // through. The service layer retries a bounded number of times on conflict.
    @Version
    @Column(nullable = false)
    private long version;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void touch() {
        this.updatedAt = Instant.now();
    }

    public BigDecimal quantityAvailable() {
        return quantityOnHand.subtract(quantityReserved);
    }
}
