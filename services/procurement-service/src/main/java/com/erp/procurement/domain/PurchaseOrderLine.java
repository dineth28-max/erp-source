package com.erp.procurement.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "purchase_order_lines")
@Getter
@Setter
@NoArgsConstructor
public class PurchaseOrderLine {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    private PurchaseOrder purchaseOrder;

    @Column(name = "item_id", nullable = false)
    private UUID itemId;

    @Column(nullable = false)
    private BigDecimal quantity;

    @Column(name = "unit_cost", nullable = false)
    private BigDecimal unitCost;

    @Column(name = "line_total", nullable = false)
    private BigDecimal lineTotal;

    public static PurchaseOrderLine of(UUID itemId, BigDecimal quantity, BigDecimal unitCost) {
        PurchaseOrderLine line = new PurchaseOrderLine();
        line.setItemId(itemId);
        line.setQuantity(quantity);
        line.setUnitCost(unitCost);
        line.setLineTotal(unitCost.multiply(quantity));
        return line;
    }
}
