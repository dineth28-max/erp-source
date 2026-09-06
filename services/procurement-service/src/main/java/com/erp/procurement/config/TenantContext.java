package com.erp.procurement.config;

import java.util.List;
import java.util.UUID;

/**
 * Holds the caller identity forwarded by api-gateway (X-Tenant-Id, X-User-Id, X-Roles)
 * after it has already verified the JWT. This service trusts those headers rather than
 * re-validating the token itself - it must never be reachable directly from outside the
 * cluster network (enforce with a NetworkPolicy / security group in production).
 */
public final class TenantContext {

    private static final ThreadLocal<Ctx> HOLDER = new ThreadLocal<>();

    private TenantContext() {
    }

    public record Ctx(UUID tenantId, UUID userId, List<String> roles) {
    }

    public static void set(Ctx ctx) {
        HOLDER.set(ctx);
    }

    public static Ctx get() {
        Ctx ctx = HOLDER.get();
        if (ctx == null) {
            throw new IllegalStateException("No tenant context bound to the current request");
        }
        return ctx;
    }

    public static void clear() {
        HOLDER.remove();
    }
}
