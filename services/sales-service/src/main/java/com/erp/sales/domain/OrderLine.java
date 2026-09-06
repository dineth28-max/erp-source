package com.erp.sales.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "order_lines")
@Getter
@Setter
@NoArgsConstructor
public class OrderLine {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "item_id", nullable = false)
    private UUID itemId;

    @Column(nullable = false)
    private BigDecimal quantity;

    @Column(name = "unit_price", nullable = false)
    private BigDecimal unitPrice;

    @Column(name = "line_total", nullable = false)
    private BigDecimal lineTotal;

    public static OrderLine of(UUID itemId, BigDecimal quantity, BigDecimal unitPrice) {
        OrderLine line = new OrderLine();
        line.setItemId(itemId);
        line.setQuantity(quantity);
        line.setUnitPrice(unitPrice);
        line.setLineTotal(unitPrice.multiply(quantity));
        return line;
    }
}
