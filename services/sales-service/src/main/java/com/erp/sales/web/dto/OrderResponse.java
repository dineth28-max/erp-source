package com.erp.sales.web.dto;

import com.erp.sales.domain.Order;
import com.erp.sales.domain.OrderStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OrderResponse(
        UUID id,
        UUID customerId,
        OrderStatus status,
        BigDecimal totalAmount,
        String failureReason,
        List<OrderLineResponse> lines,
        Instant createdAt
) {
    public static OrderResponse from(Order order) {
        return new OrderResponse(
                order.getId(),
                order.getCustomerId(),
                order.getStatus(),
                order.getTotalAmount(),
                order.getFailureReason(),
                order.getLines().stream().map(OrderLineResponse::from).toList(),
                order.getCreatedAt()
        );
    }

    // For list views: order.lines is a LAZY collection we deliberately avoid
    // touching here (see OrderService#listOrders) to sidestep an N+1 / lazy
    // init cost across a whole page of orders. Fetch the single order via
    // GET /orders/{id} to get line detail.
    public static OrderResponse fromSummary(Order order) {
        return new OrderResponse(
                order.getId(),
                order.getCustomerId(),
                order.getStatus(),
                order.getTotalAmount(),
                order.getFailureReason(),
                List.of(),
                order.getCreatedAt()
        );
    }
}
