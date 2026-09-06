package com.erp.procurement.web;

import com.erp.procurement.domain.PurchaseOrder;
import com.erp.procurement.service.PurchaseOrderService;
import com.erp.procurement.web.dto.CreatePurchaseOrderRequest;
import com.erp.procurement.web.dto.PurchaseOrderResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/purchase-orders")
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    public PurchaseOrderController(PurchaseOrderService purchaseOrderService) {
        this.purchaseOrderService = purchaseOrderService;
    }

    @PostMapping
    public ResponseEntity<PurchaseOrderResponse> create(@Valid @RequestBody CreatePurchaseOrderRequest request) {
        PurchaseOrder po = purchaseOrderService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(PurchaseOrderResponse.from(po));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchaseOrderResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(PurchaseOrderResponse.from(purchaseOrderService.get(id)));
    }

    @GetMapping
    public ResponseEntity<Page<PurchaseOrderResponse>> list(@PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(purchaseOrderService.list(pageable));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<PurchaseOrderResponse> submit(@PathVariable UUID id) {
        return ResponseEntity.ok(PurchaseOrderResponse.from(purchaseOrderService.submit(id)));
    }

    @PostMapping("/{id}/receive")
    public ResponseEntity<PurchaseOrderResponse> receive(@PathVariable UUID id) {
        return ResponseEntity.ok(PurchaseOrderResponse.from(purchaseOrderService.receive(id)));
    }
}
