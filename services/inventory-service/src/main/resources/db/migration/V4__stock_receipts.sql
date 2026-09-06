-- Stock could only ever go down (reserve/release) until now - nothing added
-- inventory back in. Mirrors stock_reservations' idempotency pattern: keyed
-- on (tenant_id, item_id, reference_id) so a retried "receive" call (from
-- procurement-service, via Resilience4j) can't double-add quantity.
CREATE TABLE stock_receipts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    item_id         UUID NOT NULL,
    reference_id    VARCHAR(200) NOT NULL,
    quantity        NUMERIC(14,3) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_stock_receipts_ref UNIQUE (tenant_id, item_id, reference_id)
);

CREATE INDEX idx_stock_receipts_tenant_item ON stock_receipts(tenant_id, item_id);
