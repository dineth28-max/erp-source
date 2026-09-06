package com.erp.masterdata.web.dto;

import com.erp.masterdata.domain.Customer;

import java.util.UUID;

public record CustomerResponse(UUID id, String name, String email, String phone) {
    public static CustomerResponse from(Customer c) {
        return new CustomerResponse(c.getId(), c.getName(), c.getEmail(), c.getPhone());
    }
}
