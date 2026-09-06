package com.erp.reporting.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "revenue_summary")
@Getter
@Setter
@NoArgsConstructor
public class RevenueSummary {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "year_month", nullable = false, length = 7)
    private String yearMonth;

    @Column(name = "confirmed_orders", nullable = false)
    private int confirmedOrders;

    @Column(name = "confirmed_revenue", nullable = false)
    private BigDecimal confirmedRevenue;

    @Column(name = "failed_orders", nullable = false)
    private int failedOrders;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void touch() {
        this.updatedAt = Instant.now();
    }
}
