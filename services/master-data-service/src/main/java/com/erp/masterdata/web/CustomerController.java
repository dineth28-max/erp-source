package com.erp.masterdata.web;

import com.erp.masterdata.service.CustomerService;
import com.erp.masterdata.web.dto.CustomerRequest;
import com.erp.masterdata.web.dto.CustomerResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/customers")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @PostMapping
    public ResponseEntity<CustomerResponse> create(@Valid @RequestBody CustomerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(CustomerResponse.from(customerService.create(request)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CustomerResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(CustomerResponse.from(customerService.get(id)));
    }

    @GetMapping
    public ResponseEntity<Page<CustomerResponse>> list(@PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(customerService.list(pageable).map(CustomerResponse::from));
    }
}
