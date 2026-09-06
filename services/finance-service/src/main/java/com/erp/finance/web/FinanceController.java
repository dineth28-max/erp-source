package com.erp.finance.web;

import com.erp.finance.config.TenantContext;
import com.erp.finance.domain.Account;
import com.erp.finance.repository.JournalEntryRepository;
import com.erp.finance.web.dto.FinanceSummaryResponse;
import com.erp.finance.web.dto.JournalEntryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/finance")
public class FinanceController {

    private final JournalEntryRepository journalEntryRepository;

    public FinanceController(JournalEntryRepository journalEntryRepository) {
        this.journalEntryRepository = journalEntryRepository;
    }

    @GetMapping("/ledger")
    public ResponseEntity<Page<JournalEntryResponse>> ledger(@PageableDefault(size = 50) Pageable pageable) {
        UUID tenantId = TenantContext.get().tenantId();
        return ResponseEntity.ok(journalEntryRepository.findByTenantIdOrderByEntryDateDescCreatedAtDesc(tenantId, pageable)
                .map(JournalEntryResponse::from));
    }

    @GetMapping("/summary")
    public ResponseEntity<FinanceSummaryResponse> summary() {
        UUID tenantId = TenantContext.get().tenantId();

        var revenue = journalEntryRepository.sumCreditByTenantIdAndAccount(tenantId, Account.REVENUE);
        var arDebit = journalEntryRepository.sumDebitByTenantIdAndAccount(tenantId, Account.ACCOUNTS_RECEIVABLE);
        var arCredit = journalEntryRepository.sumCreditByTenantIdAndAccount(tenantId, Account.ACCOUNTS_RECEIVABLE);
        var apDebit = journalEntryRepository.sumDebitByTenantIdAndAccount(tenantId, Account.ACCOUNTS_PAYABLE);
        var apCredit = journalEntryRepository.sumCreditByTenantIdAndAccount(tenantId, Account.ACCOUNTS_PAYABLE);
        var invDebit = journalEntryRepository.sumDebitByTenantIdAndAccount(tenantId, Account.INVENTORY);
        var invCredit = journalEntryRepository.sumCreditByTenantIdAndAccount(tenantId, Account.INVENTORY);

        return ResponseEntity.ok(new FinanceSummaryResponse(
                revenue,
                arDebit.subtract(arCredit),
                apCredit.subtract(apDebit),
                invDebit.subtract(invCredit)
        ));
    }
}
