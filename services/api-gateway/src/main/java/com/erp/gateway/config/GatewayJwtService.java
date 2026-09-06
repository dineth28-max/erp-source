package com.erp.gateway.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

/**
 * Verifies JWTs issued by identity-service. Both services must share
 * app.jwt.secret. This is the single point in the system that trusts a raw
 * bearer token - once verified here, downstream services trust the
 * X-Tenant-Id / X-User-Id / X-Roles headers this gateway sets instead of
 * re-parsing the token themselves.
 */
@Component
public class GatewayJwtService {

    private final SecretKey key;
    private final String issuer;

    public GatewayJwtService(@Value("${app.jwt.secret}") String secret, @Value("${app.jwt.issuer}") String issuer) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.issuer = issuer;
    }

    public Claims parseAndValidate(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .requireIssuer(issuer)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
