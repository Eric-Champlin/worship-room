package com.example.worshiproom.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS configuration for the API.
 *
 * Allowed origins are environment-specific:
 *   - dev profile: http://localhost:5173 (Vite dev server)
 *   - prod profile: https://worshiproom.com + https://www.worshiproom.com
 *
 * Methods, headers, and credentials match the Forums Wave master plan
 * decisions documented in .claude/rules/03-backend-standards.md § CORS Policy.
 */
@Configuration
public class CorsConfig {

    @Value("${proxy.cors.allowed-origins}")
    private String[] allowedOrigins;

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOrigins(allowedOrigins)
                        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                        .allowedHeaders("Content-Type", "Authorization", "X-Request-Id")
                        .exposedHeaders(
                            "X-Request-Id",
                            "X-RateLimit-Limit",
                            "X-RateLimit-Remaining",
                            "X-RateLimit-Reset",
                            "Retry-After"
                        )
                        .allowCredentials(false)
                        .maxAge(3600);
            }
        };
    }
}
