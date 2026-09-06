CREATE TABLE purchase_orders (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    vendor_id       UUID NOT NULL,
    status          VARCHAR(20) NOT NULL,
    total_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
    failure_reason  VARCHAR(500),
    created_by      UUID NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    received_at     TIMESTAMPTZ
);

CREATE TABLE purchase_order_lines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id         UUID NOT NULL,
    quantity        NUMERIC(14,3) NOT NULL,
    unit_cost       NUMERIC(14,2) NOT NULL,
    line_total      NUMERIC(14,2) NOT NULL
);

CREATE INDEX idx_purchase_orders_tenant_id ON purchase_orders(tenant_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_order_lines_po_id ON purchase_order_lines(purchase_order_id);
