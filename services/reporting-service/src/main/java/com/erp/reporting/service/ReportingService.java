package com.erp.reporting.service;

import com.erp.reporting.domain.InventoryEventLog;
import com.erp.reporting.domain.ProcessedEvent;
import com.erp.reporting.domain.RevenueSummary;
import com.erp.reporting.messaging.InventoryEventDto;
import com.erp.reporting.messaging.SalesEventDto;
import com.erp.reporting.repository.InventoryEventLogRepository;
import com.erp.reporting.repository.ProcessedEventRepository;
import com.erp.reporting.repository.RevenueSummaryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.time.ZoneOffset;

@Service
public class ReportingService {

    private static final Logger log = LoggerFactory.getLogger(ReportingService.class);

    private final RevenueSummaryRepository revenueSummaryRepository;
    private final ProcessedEventRepository processedEventRepository;
    private final InventoryEventLogRepository inventoryEventLogRepository;

    public ReportingService(RevenueSummaryRepository revenueSummaryRepository,
                             ProcessedEventRepository processedEventRepository,
                             InventoryEventLogRepository inventoryEventLogRepository) {
        this.revenueSummaryRepository = revenueSummaryRepository;
        this.processedEventRepository = processedEventRepository;
        this.inventoryEventLogRepository = inventoryEventLogRepository;
    }

    /**
     * Idempotent: replaying the same OrderPlaced/OrderFailed event (a Kafka
     * rebalance redelivery, for example) is a no-op rather than double-counting
     * revenue - see the Javadoc on ProcessedEvent for why this is needed at all.
     */
    @Transactional
    public void applySalesEvent(SalesEventDto event) {
        String key = "sales:" + event.eventType() + ":" + event.orderId();
        if (processedEventRepository.existsById(key)) {
            log.debug("Skipping already-processed event {}", key);
            return;
        }

        String yearMonth = YearMonth.from(event.occurredAt().atZone(ZoneOffset.UTC)).toString();
        RevenueSummary summary = revenueSummaryRepository.findByTenantIdAndYearMonth(event.tenantId(), yearMonth)
                .orElseGet(() -> {
                    RevenueSummary s = new RevenueSummary();
                    s.setTenantId(event.tenantId());
                    s.setYearMonth(yearMonth);
                    s.setConfirmedOrders(0);
                    s.setConfirmedRevenue(BigDecimal.ZERO);
                    s.setFailedOrders(0);
                    return s;
                });

        switch (event.eventType()) {
            case "OrderPlaced" -> {
                summary.setConfirmedOrders(summary.getConfirmedOrders() + 1);
                summary.setConfirmedRevenue(summary.getConfirmedRevenue().add(event.totalAmount()));
            }
            case "OrderFailed" -> summary.setFailedOrders(summary.getFailedOrders() + 1);
            default -> log.warn("Unrecognized sales event type: {}", event.eventType());
        }

        revenueSummaryRepository.save(summary);
        processedEventRepository.save(new ProcessedEvent(key));
    }

    @Transactional
    public void logInventoryEvent(InventoryEventDto event) {
        InventoryEventLog entity = new InventoryEventLog();
        entity.setTenantId(event.tenantId());
        entity.setEventType(event.eventType());
        entity.setItemId(event.itemId());
        entity.setWarehouseId(event.warehouseId());
        entity.setReferenceId(event.referenceId());
        entity.setQuantity(event.quantity());
        entity.setReason(event.reason());
        entity.setOccurredAt(event.occurredAt());
        inventoryEventLogRepository.save(entity);
    }
}
