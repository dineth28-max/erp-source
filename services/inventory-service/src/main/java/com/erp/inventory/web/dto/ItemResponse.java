package com.erp.inventory.web.dto;

import com.erp.inventory.domain.Item;

import java.util.UUID;

public record ItemResponse(UUID id, String sku, String name, String description) {
    public static ItemResponse from(Item item) {
        return new ItemResponse(item.getId(), item.getSku(), item.getName(), item.getDescription());
    }
}
