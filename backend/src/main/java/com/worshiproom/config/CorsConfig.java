package com.worshiproom.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;
import java.util.List;

/**
 * CORS configuration for the API.
 *
 * Two layers, complementary on purpose:
 *
 *   1. {@link CorsFilter} registered as a servlet filter at
 *      {@code HIGHEST_PRECEDENCE + 5}. This adds CORS headers to EVERY
 *      response — including responses written by earlier servlet filters
 *      like {@code JwtAuthenticationFilter} (401) and
 *      {@code LoginRateLimitFilter} (429) that reject the request before
 *      it reaches Spring MVC. Without this layer, browsers block
 *      filter-raised error responses for lack of
 *      {@code Access-Control-Allow-Origin}, and the frontend sees a
 *      generic network error instead of the correct error code — a real
 *      production UX bug caught by the Spec 1.10 Phase 1 cutover smoke
 *      (Test 5 and Test 6).
 *
 *   2. {@link WebMvcConfigurer#addCorsMappings} registered against
 *      {@code /api/**}. This is Spring MVC's controller-level CORS
 *      integration, preserved for belt-and-suspenders coverage and so any
 *      future MVC-specific CORS tuning (per-endpoint overrides, etc.) has
 *      a canonical place to land.
 *
 * Allowed origins are environment-specific:
 *   - dev profile: http://localhost:5173 (Vite dev server)
 *   - prod profile: https://worshiproom.com + https://www.worshiproom.com
 *
 * Methods, headers, exposed-headers, credentials, and max-age match the
 * Forums Wave master plan decisions documented in
 * {@code .claude/rules/03-backend-standards.md § CORS Policy}. Both
 * layers use the same shared constants so they can't drift.
 */
@Configuration
public class CorsConfig {

    private static final List<String> ALLOWED_METHODS =
        List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS");

    private static final List<String> ALLOWED_HEADERS =
        List.of("Content-Type", "Authorization", "X-Request-Id");

    private static final List<String> EXPOSED_HEADERS = List.of(
        "X-Request-Id",
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-RateLimit-Reset",
        "Retry-After"
    );

    private static final boolean ALLOW_CREDENTIALS = false;
    private static final long MAX_AGE_SECONDS = 3600L;
    private static final String API_PATH_PATTERN = "/api/**";

    @Value("${proxy.cors.allowed-origins}")
    private String[] allowedOrigins;

    @Bean
    public FilterRegistrationBean<CorsFilter> corsFilterRegistration() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList(allowedOrigins));
        config.setAllowedMethods(ALLOWED_METHODS);
        config.setAllowedHeaders(ALLOWED_HEADERS);
        config.setExposedHeaders(EXPOSED_HEADERS);
        config.setAllowCredentials(ALLOW_CREDENTIALS);
        config.setMaxAge(MAX_AGE_SECONDS);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration(API_PATH_PATTERN, config);

        FilterRegistrationBean<CorsFilter> registration =
            new FilterRegistrationBean<>(new CorsFilter(source));
        // Runs after RequestIdFilter (HIGHEST_PRECEDENCE) so the MDC
        // requestId is populated for any CORS-filter log line, but before
        // RateLimitFilter (+10), LoginRateLimitFilter (+20), and
        // JwtAuthenticationFilter so that responses short-circuited by any
        // of those still carry CORS headers.
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 5);
        return registration;
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping(API_PATH_PATTERN)
                        .allowedOrigins(allowedOrigins)
                        .allowedMethods(ALLOWED_METHODS.toArray(new String[0]))
                        .allowedHeaders(ALLOWED_HEADERS.toArray(new String[0]))
                        .exposedHeaders(EXPOSED_HEADERS.toArray(new String[0]))
                        .allowCredentials(ALLOW_CREDENTIALS)
                        .maxAge(MAX_AGE_SECONDS);
            }
        };
    }
}
