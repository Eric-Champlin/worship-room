package com.worshiproom.presence;

import com.worshiproom.auth.AuthenticatedUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Spec 6.11b — bumps the Live Presence sorted set on every read of the Prayer
 * Wall posts family. Authenticated callers are bumped as {@code user:<userId>}
 * (subject to the opt-out filter when the count is read); anonymous callers
 * receive an opaque session cookie via {@link PresenceCookieService} and are
 * bumped as {@code anon:<sessionId>}.
 *
 * <p>Best-effort: any failure (Redis down, etc.) is logged at WARN and the
 * request proceeds. Presence is a status signal, never a request blocker.
 *
 * <p>Path scoping is on {@link PresenceMvcConfig} — explicit enumeration of
 * read endpoints, NOT a wildcard. {@code GET /api/v1/prayer-wall/presence}
 * is intentionally NOT in that list (self-feeding inflates the count).
 */
/*
 * NOT a {@code @Component}. Instantiated explicitly by {@link PresenceMvcConfig}
 * so that {@code @WebMvcTest} slice tests don't pick it up as a generic
 * {@link HandlerInterceptor} bean and try to autowire its {@link PresenceService}
 * dependency outside the slice's bean graph.
 */
public class PresenceTrackingInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(PresenceTrackingInterceptor.class);

    private final PresenceService service;
    private final PresenceCookieService cookieService;

    public PresenceTrackingInterceptor(PresenceService service,
                                       PresenceCookieService cookieService) {
        this.service = service;
        this.cookieService = cookieService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) {
        // Only bump on GET — write methods are not "reading the wall."
        if (!"GET".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null
                && auth.isAuthenticated()
                && auth.getPrincipal() instanceof AuthenticatedUser principal) {
            try {
                service.bumpUser(principal.userId());
            } catch (Exception e) {
                log.warn("presenceBumpFailed cause={}", e.getClass().getSimpleName());
            }
            return true;
        }

        // Anonymous: read or issue the session cookie, then bump.
        try {
            String sessionId = cookieService.readSessionId(request)
                .orElseGet(() -> cookieService.issue(response));
            service.bumpAnon(sessionId);
        } catch (Exception e) {
            log.warn("presenceBumpAnonFailed cause={}", e.getClass().getSimpleName());
        }
        return true;
    }
}
