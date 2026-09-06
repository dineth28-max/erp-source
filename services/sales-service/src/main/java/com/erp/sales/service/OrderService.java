package com.erp.sales.service;

import com.erp.sales.client.InventoryClient;
import com.erp.sales.client.MasterDataClient;
import com.erp.sales.client.MasterDataTechnicalException;
import com.erp.sales.client.PriceNotFoundException;
import com.erp.sales.client.StockReservationResult;
import com.erp.sales.config.TenantContext;
import com.erp.sales.domain.Order;
import com.erp.sales.domain.OrderLine;
import com.erp.sales.domain.OrderStatus;
import com.erp.sales.messaging.SalesEvent;
import com.erp.sales.messaging.SalesEventPublisher;
import com.erp.sales.repository.OrderRepository;
import com.erp.sales.web.dto.CreateOrderLineRequest;
import com.erp.sales.web.dto.CreateOrderRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Orchestrates the order-placement saga across sales-service,
 * master-data-service, and inventory-service. This method deliberately does
 * NOT run inside a single JPA @Transactional block: it makes outbound HTTP
 * calls, and a distributed call must never sit inside a local DB transaction
 * (it would hold DB connections/locks for the duration of a network round
 * trip and cannot be rolled back atomically with the remote side anyway).
 * Instead, each remote reservation is compensated explicitly on failure - the
 * standard saga pattern for cross-service transactions.
 */
@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orderRepository;
    private final InventoryClient inventoryClient;
    private final MasterDataClient masterDataClient;
    private final SalesEventPublisher eventPublisher;

    public OrderService(OrderRepository orderRepository, InventoryClient inventoryClient,
                         MasterDataClient masterDataClient, SalesEventPublisher eventPublisher) {
        this.orderRepository = orderRepository;
        this.inventoryClient = inventoryClient;
        this.masterDataClient = masterDataClient;
        this.eventPublisher = eventPublisher;
    }

    public Order createOrder(CreateOrderRequest request) {
        TenantContext.Ctx ctx = TenantContext.get();
        UUID orderId = UUID.randomUUID();

        // Resolve authoritative prices before touching inventory at all - a
        // missing/unpriceable item should fail the order without ever
        // reserving stock that would then need compensating.
        List<ResolvedOrderLine> resolvedLines;
        try {
            resolvedLines = resolvePrices(ctx, request.lines());
        } catch (PriceNotFoundException | MasterDataTechnicalException e) {
            return failOrder(orderId, ctx, request, "Could not price order: " + e.getMessage());
        }

        List<ResolvedOrderLine> reserved = new ArrayList<>();
        for (ResolvedOrderLine line : resolvedLines) {
            String referenceId = orderId + ":" + line.itemId();
            StockReservationResult result = inventoryClient.reserve(
                    ctx.tenantId(), ctx.userId(), line.itemId(), line.quantity(), referenceId);

            if (!result.success()) {
                compensate(ctx, orderId, reserved);
                return failOrder(orderId, ctx, request, result.failureReason());
            }
            reserved.add(line);
        }

        Order order = buildConfirmedOrder(orderId, ctx, request, resolvedLines);
        try {
            orderRepository.save(order);
        } catch (Exception e) {
            log.error("Failed to persist confirmed order {}, compensating stock reservations", orderId, e);
            compensate(ctx, orderId, reserved);
            throw new SalesException(HttpStatus.INTERNAL_SERVER_ERROR, "Order could not be saved after stock was reserved");
        }

        eventPublisher.publish(SalesEvent.placed(ctx.tenantId(), orderId, request.customerId(), order.getTotalAmount()));
        return order;
    }

    private List<ResolvedOrderLine> resolvePrices(TenantContext.Ctx ctx, List<CreateOrderLineRequest> lines) {
        List<ResolvedOrderLine> resolved = new ArrayList<>();
        for (CreateOrderLineRequest line : lines) {
            BigDecimal price = masterDataClient.resolvePrice(ctx.tenantId(), ctx.userId(), line.itemId());
            resolved.add(new ResolvedOrderLine(line.itemId(), line.quantity(), price));
        }
        return resolved;
    }

    private Order failOrder(UUID orderId, TenantContext.Ctx ctx, CreateOrderRequest request, String reason) {
        Order failedOrder = new Order();
        failedOrder.setId(orderId);
        failedOrder.setTenantId(ctx.tenantId());
        failedOrder.setCustomerId(request.customerId());
        failedOrder.setCreatedBy(ctx.userId());
        failedOrder.setStatus(OrderStatus.FAILED);
        failedOrder.setFailureReason(reason);
        orderRepository.save(failedOrder);
        eventPublisher.publish(SalesEvent.failed(ctx.tenantId(), orderId, request.customerId(), reason));
        throw new SalesException(HttpStatus.CONFLICT, "Order could not be placed: " + reason);
    }

    private void compensate(TenantContext.Ctx ctx, UUID orderId, List<ResolvedOrderLine> reserved) {
        for (ResolvedOrderLine line : reserved) {
            String referenceId = orderId + ":" + line.itemId();
            StockReservationResult result = inventoryClient.release(ctx.tenantId(), ctx.userId(), line.itemId(), line.quantity(), referenceId);
            if (!result.success()) {
                log.error("Compensation FAILED to release {} of item {} for order {}: {}. Manual reconciliation required.",
                        line.quantity(), line.itemId(), orderId, result.failureReason());
            }
        }
    }

    private Order buildConfirmedOrder(UUID orderId, TenantContext.Ctx ctx, CreateOrderRequest request, List<ResolvedOrderLine> lines) {
        Order order = new Order();
        order.setId(orderId);
        order.setTenantId(ctx.tenantId());
        order.setCustomerId(request.customerId());
        order.setCreatedBy(ctx.userId());
        order.setStatus(OrderStatus.CONFIRMED);
        for (ResolvedOrderLine line : lines) {
            order.addLine(OrderLine.of(line.itemId(), line.quantity(), line.unitPrice()));
        }
        return order;
    }

    @Transactional(readOnly = true)
    public Order getOrder(UUID orderId) {
        UUID tenantId = TenantContext.get().tenantId();
        return orderRepository.findByIdAndTenantIdFetchLines(orderId, tenantId)
                .orElseThrow(() -> new SalesException(HttpStatus.NOT_FOUND, "Order not found: " + orderId));
    }

    // Maps to OrderResponse (rather than returning Page<Order>) while the
    // Hibernate session is still open - order.lines is LAZY and open-in-view
    // is disabled, so mapping after the transaction returns would throw
    // LazyInitializationException.
    @Transactional(readOnly = true)
    public Page<com.erp.sales.web.dto.OrderResponse> listOrders(Pageable pageable) {
        UUID tenantId = TenantContext.get().tenantId();
        return orderRepository.findByTenantId(tenantId, pageable)
                .map(com.erp.sales.web.dto.OrderResponse::fromSummary);
    }
}
