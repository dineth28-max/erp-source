package com.erp.masterdata.service;

import com.erp.masterdata.config.TenantContext;
import com.erp.masterdata.domain.PriceListEntry;
import com.erp.masterdata.repository.PriceListEntryRepository;
import com.erp.masterdata.web.dto.SetPriceRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class PriceService {

    private final PriceListEntryRepository priceListEntryRepository;

    public PriceService(PriceListEntryRepository priceListEntryRepository) {
        this.priceListEntryRepository = priceListEntryRepository;
    }

    @Transactional
    public PriceListEntry setPrice(SetPriceRequest request) {
        UUID tenantId = TenantContext.get().tenantId();
        PriceListEntry entry = priceListEntryRepository.findByTenantIdAndItemId(tenantId, request.itemId())
                .orElseGet(() -> {
                    PriceListEntry created = new PriceListEntry();
                    created.setTenantId(tenantId);
                    created.setItemId(request.itemId());
                    return created;
                });
        entry.setUnitPrice(request.unitPrice());
        return priceListEntryRepository.save(entry);
    }

    @Transactional(readOnly = true)
    public PriceListEntry getPrice(UUID itemId) {
        UUID tenantId = TenantContext.get().tenantId();
        return priceListEntryRepository.findByTenantIdAndItemId(tenantId, itemId)
                .orElseThrow(() -> new MasterDataException(HttpStatus.NOT_FOUND, "No price configured for item: " + itemId));
    }
}
