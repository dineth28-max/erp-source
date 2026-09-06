package com.erp.masterdata.web.dto;

import com.erp.masterdata.domain.Vendor;

import java.util.UUID;

public record VendorResponse(UUID id, String name, String email, String phone) {
    public static VendorResponse from(Vendor v) {
        return new VendorResponse(v.getId(), v.getName(), v.getEmail(), v.getPhone());
    }
}
