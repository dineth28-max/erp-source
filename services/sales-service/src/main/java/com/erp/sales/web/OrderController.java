package com.erp.sales.web;

import com.erp.sales.domain.Order;
import com.erp.sales.service.OrderService;
import com.erp.sales.web.dto.CreateOrderRequest;
import com.erp.sales.web.dto.OrderResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> create(@Valid @RequestBody CreateOrderRequest request) {
        Order order = orderService.createOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(OrderResponse.from(order));
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<OrderResponse> get(@PathVariable UUID orderId) {
        return ResponseEntity.ok(OrderResponse.from(orderService.getOrder(orderId)));
    }

    @GetMapping
    public ResponseEntity<Page<OrderResponse>> list(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(orderService.listOrders(pageable));
    }
}
