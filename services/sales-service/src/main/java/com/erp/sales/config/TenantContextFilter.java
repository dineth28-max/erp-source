package com.erp.sales.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Component
@Order(1)
public class TenantContextFilter extends OncePerRequestFilter {

    // The whole /actuator/ tree is exempt: Prometheus scrapes /actuator/prometheus,
    // k8s probes hit /actuator/health/*, and none of it carries tenant-scoped
    // business data. In a real deployment these bind to a separate management
    // port that isn't reachable through api-gateway's public route table at all.
    private static final String ACTUATOR_PREFIX = "/actuator/";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        if (path.startsWith(ACTUATOR_PREFIX)) {
            chain.doFilter(request, response);
            return;
        }

        String tenantHeader = request.getHeader("X-Tenant-Id");
        String userHeader = request.getHeader("X-User-Id");
        String rolesHeader = request.getHeader("X-Roles");

        if (tenantHeader == null || userHeader == null) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Missing gateway identity headers");
            return;
        }

        try {
            List<String> roles = (rolesHeader == null || rolesHeader.isBlank())
                    ? List.of()
                    : Arrays.asList(rolesHeader.split(","));
            TenantContext.set(new TenantContext.Ctx(UUID.fromString(tenantHeader), UUID.fromString(userHeader), roles));
            chain.doFilter(request, response);
        } catch (IllegalArgumentException e) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Malformed gateway identity headers");
        } finally {
            TenantContext.clear();
        }
    }
}
