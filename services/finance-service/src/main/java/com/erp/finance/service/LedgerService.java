package com.erp.finance.service;

import com.erp.finance.domain.Account;
import com.erp.finance.domain.JournalEntry;
import com.erp.finance.domain.ProcessedEvent;
import com.erp.finance.messaging.ProcurementEventDto;
import com.erp.finance.messaging.SalesEventDto;
import com.erp.finance.repository.JournalEntryRepository;
import com.erp.finance.repository.ProcessedEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneOffset;

/**
 * Posts double-entry journal pairs off two event streams:
 *  - sales-events "OrderPlaced"          -> Dr Accounts Receivable / Cr Revenue
 *  - procurement-events "PurchaseOrderReceived" -> Dr Inventory / Cr Accounts Payable
 * Every other event type is a no-op by design: OrderFailed and
 * PurchaseOrderSubmitted represent no completed economic transfer yet (accrual
 * basis - the payable/expense is recognized on receipt, not on submission).
 * Idempotent per event via ProcessedEvent, same mechanism as reporting-service.
 */
@Service
public class LedgerService {

    private static final Logger log = LoggerFactory.getLogger(LedgerService.class);

    private final JournalEntryRepository journalEntryRepository;
    private final ProcessedEventRepository processedEventRepository;

    public LedgerService(JournalEntryRepository journalEntryRepository, ProcessedEventRepository processedEventRepository) {
        this.journalEntryRepository = journalEntryRepository;
        this.processedEventRepository = processedEventRepository;
    }

    @Transactional
    public void applySalesEvent(SalesEventDto event) {
        if (!"OrderPlaced".equals(event.eventType())) {
            return;
        }
        String key = "sales:" + event.eventType() + ":" + event.orderId();
        if (processedEventRepository.existsById(key)) {
            log.debug("Skipping already-processed event {}", key);
            return;
        }

        var date = event.occurredAt().atZone(ZoneOffset.UTC).toLocalDate();
        String description = "Order " + event.orderId();
        journalEntryRepository.save(JournalEntry.debit(event.tenantId(), date, Account.ACCOUNTS_RECEIVABLE, event.totalAmount(), description, key));
        journalEntryRepository.save(JournalEntry.credit(event.tenantId(), date, Account.REVENUE, event.totalAmount(), description, key));
        processedEventRepository.save(new ProcessedEvent(key));
    }

    @Transactional
    public void applyProcurementEvent(ProcurementEventDto event) {
        if (!"PurchaseOrderReceived".equals(event.eventType())) {
            return;
        }
        String key = "procurement:" + event.eventType() + ":" + event.purchaseOrderId();
        if (processedEventRepository.existsById(key)) {
            log.debug("Skipping already-processed event {}", key);
            return;
        }

        var date = event.occurredAt().atZone(ZoneOffset.UTC).toLocalDate();
        String description = "Purchase order " + event.purchaseOrderId();
        journalEntryRepository.save(JournalEntry.debit(event.tenantId(), date, Account.INVENTORY, event.totalAmount(), description, key));
        journalEntryRepository.save(JournalEntry.credit(event.tenantId(), date, Account.ACCOUNTS_PAYABLE, event.totalAmount(), description, key));
        processedEventRepository.save(new ProcessedEvent(key));
    }
}
