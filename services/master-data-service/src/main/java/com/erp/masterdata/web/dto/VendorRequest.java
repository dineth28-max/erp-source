package com.erp.masterdata.web.dto;

import jakarta.validation.constraints.NotBlank;

public record VendorRequest(@NotBlank String name, String email, String phone) {
}
