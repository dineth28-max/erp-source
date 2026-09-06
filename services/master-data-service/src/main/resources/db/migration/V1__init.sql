CREATE TABLE customers (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL,
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255),
    phone         VARCHAR(50),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vendors (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL,
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255),
    phone         VARCHAR(50),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One active price per (tenant, item) - no historical/date-ranged pricing
-- yet, that's a real feature for later. item_id references inventory-service's
-- Item.id by convention only (no cross-service FK is possible or desirable).
CREATE TABLE price_list_entries (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL,
    item_id       UUID NOT NULL,
    unit_price    NUMERIC(14,2) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_price_tenant_item UNIQUE (tenant_id, item_id)
);

CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_vendors_tenant_id ON vendors(tenant_id);
CREATE INDEX idx_price_list_entries_tenant_id ON price_list_entries(tenant_id);

-- Seed data matching the demo tenant/customer/item used throughout the
-- other services' seed data and README examples.
INSERT INTO customers (tenant_id, id, name, email) VALUES
    ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Demo Customer', 'demo.customer@example.com');

INSERT INTO price_list_entries (tenant_id, item_id, unit_price) VALUES
    ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 19.99);
