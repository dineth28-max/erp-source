package com.erp.masterdata.web.dto;

import jakarta.validation.constraints.NotBlank;

public record CustomerRequest(@NotBlank String name, String email, String phone) {
}
