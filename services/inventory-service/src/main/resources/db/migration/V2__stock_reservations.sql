-- Records every reservation/release keyed by the caller-supplied reference_id
-- (sales-service uses "<orderId>:<itemId>"), so /stock/reserve and
-- /stock/release are idempotent under retry: a Resilience4j retry after an
-- ambiguous timeout replays the same reference_id and must not double-apply
-- the quantity change.
CREATE TABLE stock_reservations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    item_id         UUID NOT NULL,
    reference_id    VARCHAR(200) NOT NULL,
    quantity        NUMERIC(14,3) NOT NULL,
    status          VARCHAR(20) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_stock_reservations_ref UNIQUE (tenant_id, item_id, reference_id)
);

CREATE INDEX idx_stock_reservations_tenant_item ON stock_reservations(tenant_id, item_id);
