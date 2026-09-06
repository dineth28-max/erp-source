package com.erp.finance.config;

import java.util.List;
import java.util.UUID;

/**
 * Holds the caller identity forwarded by api-gateway for the REST query API.
 * Kafka consumers get tenantId from the event payload instead - this context
 * is only bound during HTTP request handling.
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
