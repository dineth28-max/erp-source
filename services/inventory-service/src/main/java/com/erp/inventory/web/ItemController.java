package com.erp.inventory.web;

import com.erp.inventory.domain.Item;
import com.erp.inventory.service.InventoryService;
import com.erp.inventory.web.dto.CreateItemRequest;
import com.erp.inventory.web.dto.ItemResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/items")
public class ItemController {

    private final InventoryService inventoryService;

    public ItemController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @PostMapping
    public ResponseEntity<ItemResponse> create(@Valid @RequestBody CreateItemRequest request) {
        Item item = inventoryService.createItem(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ItemResponse.from(item));
    }

    @GetMapping("/{itemId}")
    public ResponseEntity<ItemResponse> get(@PathVariable UUID itemId) {
        return ResponseEntity.ok(ItemResponse.from(inventoryService.getItem(itemId)));
    }

    @GetMapping
    public ResponseEntity<Page<ItemResponse>> list(@PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(inventoryService.listItems(pageable).map(ItemResponse::from));
    }
}
