package com.erp.finance.repository;

import com.erp.finance.domain.Account;
import com.erp.finance.domain.JournalEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface JournalEntryRepository extends JpaRepository<JournalEntry, UUID> {

    Page<JournalEntry> findByTenantIdOrderByEntryDateDescCreatedAtDesc(UUID tenantId, Pageable pageable);

    @Query("select coalesce(sum(j.debit), 0) from JournalEntry j where j.tenantId = :tenantId and j.account = :account")
    BigDecimal sumDebitByTenantIdAndAccount(UUID tenantId, Account account);

    @Query("select coalesce(sum(j.credit), 0) from JournalEntry j where j.tenantId = :tenantId and j.account = :account")
    BigDecimal sumCreditByTenantIdAndAccount(UUID tenantId, Account account);

    List<JournalEntry> findByTenantIdAndAccount(UUID tenantId, Account account);
}
