package com.worshiproom.auth;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtService jwtService,
            RestAuthenticationEntryPoint authenticationEntryPoint,
            @Qualifier("handlerExceptionResolver") HandlerExceptionResolver handlerExceptionResolver
    ) throws Exception {
        // JwtAuthenticationFilter is NOT a Spring bean — constructed inline
        // so Spring Boot's servlet-filter auto-registration does not run it
        // twice. Lives only inside the Spring Security filter chain, which
        // itself runs via DelegatingFilterProxy AFTER RequestIdFilter (HIGHEST_PRECEDENCE)
        // and RateLimitFilter (HIGHEST_PRECEDENCE + 10).
        JwtAuthenticationFilter jwtAuthenticationFilter =
            new JwtAuthenticationFilter(jwtService, handlerExceptionResolver);

        return http
            .authorizeHttpRequests(auth -> auth
                // CORS preflight always allowed — prevents filter chain from
                // eating OPTIONS requests that cross-origin browsers send
                // before the actual request. MANDATORY per 03-backend-standards.md.
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // Public (unauthenticated) routes — single source of truth is
                // PublicPaths.PATTERNS, also consumed by JwtAuthenticationFilter.
                // Includes health endpoints, legacy trivial endpoints, auth
                // endpoints (Spec 1.5 implements bodies; routes declared public
                // now), proxy layer (permitAll() IGNORES any Authorization
                // header — see spec Decision #5), and actuator health probes.
                .requestMatchers(PublicPaths.PATTERNS.toArray(new String[0])).permitAll()

                // Spec 3.5 — write methods on /api/v1/posts require authentication.
                // MUST come BEFORE OPTIONAL_AUTH_PATTERNS so the method-specific rule
                // wins over the path-only permitAll. Spring Security iterates rules
                // in order; first match wins.
                .requestMatchers(HttpMethod.POST, "/api/v1/posts").authenticated()
                .requestMatchers(HttpMethod.PATCH, "/api/v1/posts/*").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/v1/posts/*").authenticated()

                // Spec 3.6 — write methods on comments require authentication. Same
                // first-match-wins rule as Spec 3.5: these come BEFORE OPTIONAL_AUTH_PATTERNS
                // so the method-specific rule wins over the path-only permitAll on the
                // GET path declared by Spec 3.4.
                .requestMatchers(HttpMethod.POST, "/api/v1/posts/*/comments").authenticated()
                .requestMatchers(HttpMethod.PATCH, "/api/v1/comments/*").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/v1/comments/*").authenticated()

                // Spec 3.7 — write methods on reactions and bookmarks require
                // authentication. Same first-match-wins rule as Specs 3.5 and 3.6:
                // these come BEFORE OPTIONAL_AUTH_PATTERNS so the method-specific
                // rule wins. Spring's AntPathMatcher does NOT match nested paths
                // via /api/v1/posts/* — explicit nested patterns required (Spec 3.7 R7).
                .requestMatchers(HttpMethod.POST, "/api/v1/posts/*/reactions").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/v1/posts/*/reactions").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/v1/posts/*/bookmark").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/v1/posts/*/bookmark").authenticated()

                // Spec 1.10f — POST /api/v1/users/me/legal/accept requires authentication.
                // MUST come BEFORE OPTIONAL_AUTH_PATTERNS so the method-specific rule wins.
                .requestMatchers(HttpMethod.POST, "/api/v1/users/me/legal/accept").authenticated()

                // Optional-auth routes (Spec 3.3) — permitAll() lets anonymous
                // requests through, but JwtAuthenticationFilter still processes
                // them so a valid token extracts a principal for personalization.
                // Invalid tokens still return 401.
                .requestMatchers(PublicPaths.OPTIONAL_AUTH_PATTERNS.toArray(new String[0])).permitAll()

                // Everything under /api/v1/** requires a valid JWT
                .requestMatchers("/api/v1/**").authenticated()

                // Any unmapped path (e.g. /error pathways) — permit to avoid
                // masking legitimate 404s as 401s. Spring MVC still resolves
                // the actual status afterwards.
                .anyRequest().permitAll()
            )
            .exceptionHandling(eh -> eh.authenticationEntryPoint(authenticationEntryPoint))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .httpBasic(basic -> basic.disable())
            .formLogin(form -> form.disable())
            .addFilterAfter(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
