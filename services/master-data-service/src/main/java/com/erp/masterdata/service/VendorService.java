package com.erp.masterdata.service;

import com.erp.masterdata.config.TenantContext;
import com.erp.masterdata.domain.Vendor;
import com.erp.masterdata.repository.VendorRepository;
import com.erp.masterdata.web.dto.VendorRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class VendorService {

    private final VendorRepository vendorRepository;

    public VendorService(VendorRepository vendorRepository) {
        this.vendorRepository = vendorRepository;
    }

    @Transactional
    public Vendor create(VendorRequest request) {
        Vendor vendor = new Vendor();
        vendor.setTenantId(TenantContext.get().tenantId());
        vendor.setName(request.name());
        vendor.setEmail(request.email());
        vendor.setPhone(request.phone());
        return vendorRepository.save(vendor);
    }

    @Transactional(readOnly = true)
    public Vendor get(UUID id) {
        UUID tenantId = TenantContext.get().tenantId();
        return vendorRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new MasterDataException(HttpStatus.NOT_FOUND, "Vendor not found: " + id));
    }

    @Transactional(readOnly = true)
    public Page<Vendor> list(Pageable pageable) {
        return vendorRepository.findByTenantId(TenantContext.get().tenantId(), pageable);
    }
}
