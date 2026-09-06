package com.erp.inventory.web.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateItemRequest(
        @NotBlank String sku,
        @NotBlank String name,
        String description
) {
}
