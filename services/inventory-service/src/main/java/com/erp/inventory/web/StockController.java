package com.erp.inventory.web;

import com.erp.inventory.service.InventoryService;
import com.erp.inventory.web.dto.ReserveStockRequest;
import com.erp.inventory.web.dto.StockResponse;
import com.erp.inventory.web.dto.StockSummaryResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@Validated
@RequestMapping("/api/v1/stock")
public class StockController {

    private final InventoryService inventoryService;

    public StockController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    // Literal path wins over /{itemId}, so this never collides with an item id.
    @GetMapping("/summary")
    public ResponseEntity<StockSummaryResponse> summary(
            @RequestParam(defaultValue = "10") @DecimalMin("0") BigDecimal lowStockThreshold) {
        return ResponseEntity.ok(inventoryService.stockSummary(lowStockThreshold));
    }

    @GetMapping("/{itemId}")
    public ResponseEntity<StockResponse> get(@PathVariable UUID itemId) {
        return ResponseEntity.ok(StockResponse.from(inventoryService.getStock(itemId)));
    }

    @PostMapping("/reserve")
    public ResponseEntity<StockResponse> reserve(@Valid @RequestBody ReserveStockRequest request) {
        return ResponseEntity.ok(StockResponse.from(inventoryService.reserve(request)));
    }

    @PostMapping("/release")
    public ResponseEntity<StockResponse> release(@Valid @RequestBody ReserveStockRequest request) {
        return ResponseEntity.ok(StockResponse.from(inventoryService.release(request)));
    }

    @PostMapping("/receive")
    public ResponseEntity<StockResponse> receive(@Valid @RequestBody ReserveStockRequest request) {
        return ResponseEntity.ok(StockResponse.from(inventoryService.receive(request)));
    }
}
