package com.erp.procurement.service;

import com.erp.procurement.client.InventoryClient;
import com.erp.procurement.client.StockReceiveResult;
import com.erp.procurement.config.TenantContext;
import com.erp.procurement.domain.PurchaseOrder;
import com.erp.procurement.domain.PurchaseOrderLine;
import com.erp.procurement.domain.PurchaseOrderStatus;
import com.erp.procurement.messaging.ProcurementEvent;
import com.erp.procurement.messaging.ProcurementEventPublisher;
import com.erp.procurement.repository.PurchaseOrderRepository;
import com.erp.procurement.web.dto.CreatePurchaseOrderLineRequest;
import com.erp.procurement.web.dto.CreatePurchaseOrderRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * The Procure-to-Pay saga's create/submit/receive lifecycle. "Receive" calls
 * inventory-service's /stock/receive per line; unlike sales-service's saga,
 * a partial failure here needs no compensation - adding stock has no
 * "insufficient X" failure mode, so a failed line just means "retry the
 * receive call," and inventory-service's idempotent receipts table makes
 * already-received lines a safe no-op on retry (see StockMutator.receiveOnce).
 */
@Service
public class PurchaseOrderService {

    private static final Logger log = LoggerFactory.getLogger(PurchaseOrderService.class);

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final InventoryClient inventoryClient;
    private final ProcurementEventPublisher eventPublisher;

    public PurchaseOrderService(PurchaseOrderRepository purchaseOrderRepository, InventoryClient inventoryClient,
                                 ProcurementEventPublisher eventPublisher) {
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.inventoryClient = inventoryClient;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public PurchaseOrder create(CreatePurchaseOrderRequest request) {
        TenantContext.Ctx ctx = TenantContext.get();
        PurchaseOrder po = new PurchaseOrder();
        po.setId(UUID.randomUUID());
        po.setTenantId(ctx.tenantId());
        po.setVendorId(request.vendorId());
        po.setCreatedBy(ctx.userId());
        po.setStatus(PurchaseOrderStatus.DRAFT);
        for (CreatePurchaseOrderLineRequest line : request.lines()) {
            po.addLine(PurchaseOrderLine.of(line.itemId(), line.quantity(), line.unitCost()));
        }
        return purchaseOrderRepository.save(po);
    }

    @Transactional
    public PurchaseOrder submit(UUID id) {
        PurchaseOrder po = getForUpdate(id);
        if (po.getStatus() != PurchaseOrderStatus.DRAFT) {
            throw new ProcurementException(HttpStatus.CONFLICT, "Only a DRAFT purchase order can be submitted, this one is " + po.getStatus());
        }
        po.setStatus(PurchaseOrderStatus.SUBMITTED);
        PurchaseOrder saved = purchaseOrderRepository.save(po);
        eventPublisher.publish(ProcurementEvent.submitted(po.getTenantId(), po.getId(), po.getVendorId(), po.getTotalAmount()));
        return saved;
    }

    /**
     * Deliberately not wrapped in the surrounding @Transactional - it makes
     * outbound HTTP calls per line, and a distributed call must never sit
     * inside a local DB transaction (see sales-service's OrderService for the
     * same reasoning). Each line's stock update commits independently and
     * idempotently; only the final status flip is its own short transaction.
     */
    public PurchaseOrder receive(UUID id) {
        TenantContext.Ctx ctx = TenantContext.get();
        PurchaseOrder po = getForUpdate(id);
        if (po.getStatus() != PurchaseOrderStatus.SUBMITTED) {
            throw new ProcurementException(HttpStatus.CONFLICT, "Only a SUBMITTED purchase order can be received, this one is " + po.getStatus());
        }

        for (PurchaseOrderLine line : po.getLines()) {
            String referenceId = po.getId() + ":" + line.getItemId();
            StockReceiveResult result = inventoryClient.receive(ctx.tenantId(), ctx.userId(), line.getItemId(), line.getQuantity(), referenceId);
            if (!result.success()) {
                log.error("Failed to receive line (item {}) of PO {}: {}. PO stays SUBMITTED - retry /receive once resolved; " +
                        "already-received lines are a no-op on retry.", line.getItemId(), po.getId(), result.failureReason());
                throw new ProcurementException(HttpStatus.BAD_GATEWAY,
                        "Could not receive item " + line.getItemId() + ": " + result.failureReason() + ". Safe to retry.");
            }
        }

        // Not wrapped in its own @Transactional method: PurchaseOrderService is
        // a plain Spring bean, and a self-invoked call (this.markReceived(...))
        // would bypass the proxy that makes @Transactional work at all - see
        // StockMutator's Javadoc in inventory-service for the same pitfall.
        // save() on an already-persistent entity (isNew()==false, set by
        // @PostLoad) merges correctly on its own within the repository's own
        // transaction, so no explicit boundary is needed here.
        po.setStatus(PurchaseOrderStatus.RECEIVED);
        po.setReceivedAt(java.time.Instant.now());
        PurchaseOrder saved = purchaseOrderRepository.save(po);
        eventPublisher.publish(ProcurementEvent.received(po.getTenantId(), po.getId(), po.getVendorId(), po.getTotalAmount()));
        return saved;
    }

    @Transactional(readOnly = true)
    public PurchaseOrder get(UUID id) {
        return getForUpdate(id);
    }

    @Transactional(readOnly = true)
    public Page<com.erp.procurement.web.dto.PurchaseOrderResponse> list(Pageable pageable) {
        UUID tenantId = TenantContext.get().tenantId();
        return purchaseOrderRepository.findByTenantId(tenantId, pageable)
                .map(com.erp.procurement.web.dto.PurchaseOrderResponse::fromSummary);
    }

    private PurchaseOrder getForUpdate(UUID id) {
        UUID tenantId = TenantContext.get().tenantId();
        return purchaseOrderRepository.findByIdAndTenantIdFetchLines(id, tenantId)
                .orElseThrow(() -> new ProcurementException(HttpStatus.NOT_FOUND, "Purchase order not found: " + id));
    }
}
