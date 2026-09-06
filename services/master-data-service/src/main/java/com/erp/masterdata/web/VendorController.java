package com.erp.masterdata.web;

import com.erp.masterdata.service.VendorService;
import com.erp.masterdata.web.dto.VendorRequest;
import com.erp.masterdata.web.dto.VendorResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/vendors")
public class VendorController {

    private final VendorService vendorService;

    public VendorController(VendorService vendorService) {
        this.vendorService = vendorService;
    }

    @PostMapping
    public ResponseEntity<VendorResponse> create(@Valid @RequestBody VendorRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(VendorResponse.from(vendorService.create(request)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<VendorResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(VendorResponse.from(vendorService.get(id)));
    }

    @GetMapping
    public ResponseEntity<Page<VendorResponse>> list(@PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(vendorService.list(pageable).map(VendorResponse::from));
    }
}
