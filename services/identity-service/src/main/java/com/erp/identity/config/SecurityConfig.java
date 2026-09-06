package com.erp.identity.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // The whole /actuator/ tree is open for the same reason as the
                        // matching exemption in inventory-service/sales-service's
                        // TenantContextFilter: Prometheus needs /actuator/prometheus and
                        // k8s probes need /actuator/health/*, none of it is tenant data,
                        // and a real deployment binds it to a separate management port
                        // not exposed via api-gateway's public routes anyway.
                        .requestMatchers("/api/v1/auth/**", "/actuator/**").permitAll()
                        .anyRequest().authenticated()
                );
        return http.build();
    }
}
