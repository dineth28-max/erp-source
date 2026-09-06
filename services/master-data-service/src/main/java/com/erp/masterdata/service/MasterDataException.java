package com.erp.masterdata.service;

import org.springframework.http.HttpStatus;

public class MasterDataException extends RuntimeException {

    private final HttpStatus status;

    public MasterDataException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
