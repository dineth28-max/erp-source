package com.erp.finance.web.dto;

import com.erp.finance.domain.JournalEntry;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record JournalEntryResponse(
        UUID id,
        LocalDate entryDate,
        String account,
        BigDecimal debit,
        BigDecimal credit,
        String description
) {
    public static JournalEntryResponse from(JournalEntry e) {
        return new JournalEntryResponse(e.getId(), e.getEntryDate(), e.getAccount().name(), e.getDebit(), e.getCredit(), e.getDescription());
    }
}
