CREATE TABLE tenants (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(255) NOT NULL,
    slug          VARCHAR(100) NOT NULL UNIQUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    username        VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    roles           VARCHAR(500) NOT NULL DEFAULT 'ROLE_USER',
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_tenant_username UNIQUE (tenant_id, username),
    CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email)
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);

-- Default tenant + admin user for local/dev bootstrap.
-- Password is "Passw0rd!" (BCrypt hash) - change on first login in real deployments.
INSERT INTO tenants (id, name, slug) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Default Tenant', 'default');

INSERT INTO users (tenant_id, username, email, password_hash, roles) VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin', 'admin@example.com',
     '$2b$10$iKzjnYwinMbS/tB4cP20ke.deXDrHColbdCQa2bxAvCf1Sthv4kTC', 'ROLE_ADMIN,ROLE_USER');
