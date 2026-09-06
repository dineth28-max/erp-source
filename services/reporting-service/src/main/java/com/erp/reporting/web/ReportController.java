package com.erp.reporting.web;

import com.erp.reporting.config.TenantContext;
import com.erp.reporting.repository.InventoryEventLogRepository;
import com.erp.reporting.repository.RevenueSummaryRepository;
import com.erp.reporting.web.dto.InventoryEventResponse;
import com.erp.reporting.web.dto.RevenueSummaryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
public class ReportController {

    private final RevenueSummaryRepository revenueSummaryRepository;
    private final InventoryEventLogRepository inventoryEventLogRepository;

    public ReportController(RevenueSummaryRepository revenueSummaryRepository,
                             InventoryEventLogRepository inventoryEventLogRepository) {
        this.revenueSummaryRepository = revenueSummaryRepository;
        this.inventoryEventLogRepository = inventoryEventLogRepository;
    }

    @GetMapping("/revenue-summary")
    public ResponseEntity<List<RevenueSummaryResponse>> revenueSummary() {
        UUID tenantId = TenantContext.get().tenantId();
        List<RevenueSummaryResponse> body = revenueSummaryRepository.findByTenantIdOrderByYearMonthAsc(tenantId)
                .stream().map(RevenueSummaryResponse::from).toList();
        return ResponseEntity.ok(body);
    }

    @GetMapping("/inventory-events")
    public ResponseEntity<Page<InventoryEventResponse>> inventoryEvents(@PageableDefault(size = 50) Pageable pageable) {
        UUID tenantId = TenantContext.get().tenantId();
        return ResponseEntity.ok(inventoryEventLogRepository.findByTenantIdOrderByOccurredAtDesc(tenantId, pageable)
                .map(InventoryEventResponse::from));
    }
}
