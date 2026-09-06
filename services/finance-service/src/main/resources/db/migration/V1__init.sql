-- A simplified double-entry ledger. Every economic event (a confirmed sale,
-- a received purchase order) produces exactly two rows here - one debit, one
-- credit - sharing the same source_event_key, so the ledger always balances
-- by construction: sum(debit) always equals sum(credit) for any given event.
CREATE TABLE journal_entries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL,
    entry_date          DATE NOT NULL,
    account             VARCHAR(50) NOT NULL,
    debit               NUMERIC(14,2) NOT NULL DEFAULT 0,
    credit              NUMERIC(14,2) NOT NULL DEFAULT 0,
    description         VARCHAR(500) NOT NULL,
    source_event_key    VARCHAR(300) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_journal_entries_tenant_date ON journal_entries(tenant_id, entry_date);
CREATE INDEX idx_journal_entries_account ON journal_entries(tenant_id, account);
CREATE INDEX idx_journal_entries_source_event ON journal_entries(source_event_key);

-- Same idempotency mechanism as reporting-service's processed_events: a
-- Kafka redelivery must not post the same journal pair twice.
CREATE TABLE processed_events (
    event_key       VARCHAR(300) PRIMARY KEY,
    processed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
