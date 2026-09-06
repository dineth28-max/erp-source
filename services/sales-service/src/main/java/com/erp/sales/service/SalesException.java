package com.erp.sales.service;

import org.springframework.http.HttpStatus;

public class SalesException extends RuntimeException {

    private final HttpStatus status;

    public SalesException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
