package com.erp.identity.service;

import com.erp.identity.domain.Tenant;
import com.erp.identity.domain.User;
import com.erp.identity.repository.TenantRepository;
import com.erp.identity.repository.UserRepository;
import com.erp.identity.security.JwtService;
import com.erp.identity.web.dto.AuthResponse;
import com.erp.identity.web.dto.LoginRequest;
import com.erp.identity.web.dto.RegisterRequest;
import io.jsonwebtoken.Claims;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final String DEFAULT_TENANT_SLUG = "default";

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, TenantRepository tenantRepository,
                        PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.tenantRepository = tenantRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        Tenant tenant = resolveTenant(request.tenantSlug());

        if (userRepository.existsByTenantIdAndUsername(tenant.getId(), request.username())) {
            throw new AuthException(HttpStatus.CONFLICT, "Username already taken");
        }
        if (userRepository.existsByTenantIdAndEmail(tenant.getId(), request.email())) {
            throw new AuthException(HttpStatus.CONFLICT, "Email already registered");
        }

        User user = new User();
        user.setTenantId(tenant.getId());
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRoles("ROLE_USER");
        user.setEnabled(true);
        userRepository.save(user);

        return issueTokens(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        Tenant tenant = resolveTenant(request.tenantSlug());

        User user = userRepository.findByTenantIdAndUsername(tenant.getId(), request.username())
                .orElseThrow(() -> new AuthException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!user.isEnabled()) {
            throw new AuthException(HttpStatus.FORBIDDEN, "Account disabled");
        }
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        return issueTokens(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse refresh(String refreshToken) {
        Claims claims;
        try {
            claims = jwtService.parse(refreshToken);
        } catch (Exception e) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, "Invalid or expired refresh token");
        }
        if (!"refresh".equals(claims.get("typ", String.class))) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, "Token is not a refresh token");
        }

        User user = userRepository.findById(java.util.UUID.fromString(claims.get("uid", String.class)))
                .orElseThrow(() -> new AuthException(HttpStatus.UNAUTHORIZED, "User no longer exists"));
        if (!user.isEnabled()) {
            throw new AuthException(HttpStatus.FORBIDDEN, "Account disabled");
        }

        return issueTokens(user);
    }

    private AuthResponse issueTokens(User user) {
        String access = jwtService.generateAccessToken(user.getId(), user.getTenantId(), user.getUsername(), user.roleList());
        String refresh = jwtService.generateRefreshToken(user.getId(), user.getTenantId(), user.getUsername());
        return AuthResponse.of(access, refresh, jwtService.accessTtlSeconds());
    }

    private Tenant resolveTenant(String slug) {
        String effectiveSlug = (slug == null || slug.isBlank()) ? DEFAULT_TENANT_SLUG : slug;
        return tenantRepository.findBySlug(effectiveSlug)
                .orElseThrow(() -> new AuthException(HttpStatus.BAD_REQUEST, "Unknown tenant: " + effectiveSlug));
    }
}
