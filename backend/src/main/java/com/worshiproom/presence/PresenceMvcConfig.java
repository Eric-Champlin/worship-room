package com.worshiproom.presence;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Spec 6.11b — registers {@link PresenceTrackingInterceptor} on the explicit
 * read paths of the Prayer Wall posts family.
 *
 * <p>NOTE: {@code /api/v1/prayer-wall/presence} is INTENTIONALLY NOT in this
 * list — the count-read should not feed itself.
 *
 * <p>Explicit enumeration over wildcard pattern aligns with Phase 3 Addendum
 * item 4 (nested paths need their own rules; a {@code /api/v1/posts/**}
 * wildcard would catch unintended future paths).
 *
 * <p>Uses {@link ObjectProvider} for lazy interceptor resolution — keeps
 * {@code @WebMvcTest} slice tests (which only load the controller under test
 * and not full presence stack) from failing on missing {@code PresenceService}
 * dependency. When the interceptor bean is absent, registration is skipped.
 */
@Configuration
public class PresenceMvcConfig implements WebMvcConfigurer {

    private final ObjectProvider<PresenceService> serviceProvider;
    private final ObjectProvider<PresenceCookieService> cookieServiceProvider;

    public PresenceMvcConfig(ObjectProvider<PresenceService> serviceProvider,
                             ObjectProvider<PresenceCookieService> cookieServiceProvider) {
        this.serviceProvider = serviceProvider;
        this.cookieServiceProvider = cookieServiceProvider;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        PresenceService service = serviceProvider.getIfAvailable();
        PresenceCookieService cookieService = cookieServiceProvider.getIfAvailable();
        if (service == null || cookieService == null) return;
        registry.addInterceptor(new PresenceTrackingInterceptor(service, cookieService))
            .addPathPatterns(
                "/api/v1/posts",
                "/api/v1/posts/*",
                "/api/v1/posts/*/comments",
                "/api/v1/posts/*/intercessors",
                "/api/v1/users/*/posts"
            );
    }
}
