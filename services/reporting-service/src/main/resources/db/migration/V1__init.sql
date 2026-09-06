-- CQRS read model: incrementally updated as sales-events arrive, so a
-- dashboard query is a single indexed row lookup instead of scanning and
-- summing every order client-side (which is what the frontend did before
-- this service existed - see DashboardPage.jsx history).
CREATE TABLE revenue_summary (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL,
    year_month          VARCHAR(7) NOT NULL,  -- 'YYYY-MM'
    confirmed_orders    INTEGER NOT NULL DEFAULT 0,
    confirmed_revenue   NUMERIC(14,2) NOT NULL DEFAULT 0,
    failed_orders       INTEGER NOT NULL DEFAULT 0,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_revenue_summary_tenant_month UNIQUE (tenant_id, year_month)
);

-- Raw append-only projection of inventory events, for an activity feed / audit
-- trail. Unlike revenue_summary this isn't aggregated - inventory events are
-- read far less often than revenue, so there's no need to pre-aggregate them.
CREATE TABLE inventory_event_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    event_type      VARCHAR(50) NOT NULL,
    item_id         UUID NOT NULL,
    warehouse_id    UUID,
    reference_id    VARCHAR(200),
    quantity        NUMERIC(14,3),
    reason          VARCHAR(500),
    occurred_at     TIMESTAMPTZ NOT NULL,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tracks which Kafka partition offsets have already been applied to
-- revenue_summary, so a consumer restart/rebalance replaying already-seen
-- records can't double-count them (Kafka's own offset commits protect against
-- re-reading a record, but not against reprocessing during a rebalance-caused
-- redelivery - this table makes the projection idempotent regardless).
CREATE TABLE processed_events (
    event_key       VARCHAR(300) PRIMARY KEY,
    processed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_revenue_summary_tenant ON revenue_summary(tenant_id);
CREATE INDEX idx_inventory_event_log_tenant ON inventory_event_log(tenant_id, occurred_at DESC);
