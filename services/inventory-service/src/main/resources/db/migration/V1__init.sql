CREATE TABLE items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL,
    sku           VARCHAR(64) NOT NULL,
    name          VARCHAR(255) NOT NULL,
    description   VARCHAR(2000),
    unit_price    NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_items_tenant_sku UNIQUE (tenant_id, sku)
);

CREATE TABLE warehouses (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL,
    code          VARCHAR(32) NOT NULL,
    name          VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_warehouses_tenant_code UNIQUE (tenant_id, code)
);

CREATE TABLE stock_levels (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL,
    item_id             UUID NOT NULL REFERENCES items(id),
    warehouse_id        UUID NOT NULL REFERENCES warehouses(id),
    quantity_on_hand    NUMERIC(14,3) NOT NULL DEFAULT 0,
    quantity_reserved   NUMERIC(14,3) NOT NULL DEFAULT 0,
    version             BIGINT NOT NULL DEFAULT 0,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_stock_item_warehouse UNIQUE (item_id, warehouse_id),
    CONSTRAINT chk_stock_non_negative CHECK (quantity_on_hand >= 0 AND quantity_reserved >= 0 AND quantity_reserved <= quantity_on_hand)
);

CREATE INDEX idx_items_tenant_id ON items(tenant_id);
CREATE INDEX idx_stock_levels_tenant_id ON stock_levels(tenant_id);
CREATE INDEX idx_stock_levels_item_id ON stock_levels(item_id);

-- Seed data for local/dev testing under the default tenant.
INSERT INTO warehouses (id, tenant_id, code, name) VALUES
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'MAIN', 'Main Warehouse');

INSERT INTO items (id, tenant_id, sku, name, description, unit_price) VALUES
    ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'SKU-0001', 'Sample Widget', 'Demo item for local testing', 19.99);

INSERT INTO stock_levels (tenant_id, item_id, warehouse_id, quantity_on_hand, quantity_reserved) VALUES
    ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1000, 0);
