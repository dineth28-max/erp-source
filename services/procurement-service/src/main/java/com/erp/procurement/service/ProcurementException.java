package com.erp.procurement.service;

import org.springframework.http.HttpStatus;

public class ProcurementException extends RuntimeException {

    private final HttpStatus status;

    public ProcurementException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
