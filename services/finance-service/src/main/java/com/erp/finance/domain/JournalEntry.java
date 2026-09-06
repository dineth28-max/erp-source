package com.erp.finance.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "journal_entries")
@Getter
@Setter
@NoArgsConstructor
public class JournalEntry {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private Account account;

    @Column(nullable = false)
    private BigDecimal debit = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal credit = BigDecimal.ZERO;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(name = "source_event_key", nullable = false)
    private String sourceEventKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }

    public static JournalEntry debit(UUID tenantId, LocalDate date, Account account, BigDecimal amount, String description, String sourceEventKey) {
        JournalEntry e = new JournalEntry();
        e.setTenantId(tenantId);
        e.setEntryDate(date);
        e.setAccount(account);
        e.setDebit(amount);
        e.setDescription(description);
        e.setSourceEventKey(sourceEventKey);
        return e;
    }

    public static JournalEntry credit(UUID tenantId, LocalDate date, Account account, BigDecimal amount, String description, String sourceEventKey) {
        JournalEntry e = new JournalEntry();
        e.setTenantId(tenantId);
        e.setEntryDate(date);
        e.setAccount(account);
        e.setCredit(amount);
        e.setDescription(description);
        e.setSourceEventKey(sourceEventKey);
        return e;
    }
}
