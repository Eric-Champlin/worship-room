package com.worshiproom.presence;

import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.presence.dto.PresenceResponse;
import com.worshiproom.proxy.common.IpResolver;
import com.worshiproom.proxy.common.ProxyResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Spec 6.11b — {@code GET /api/v1/prayer-wall/presence}.
 *
 * <p>Returns the count of "present" users on the Prayer Wall, cached server-side
 * for 30s. Public endpoint (in {@code OPTIONAL_AUTH_PATTERNS}); both
 * authenticated and anonymous callers may invoke.
 *
 * <p>Authenticated callers go through the per-user 120/min bucket; anonymous
 * callers through the per-IP 60/min bucket. Bucket exhaustion → 429 RATE_LIMITED.
 */
@RestController
@RequestMapping("/api/v1/prayer-wall")
public class PresenceController {

    private static final Logger log = LoggerFactory.getLogger(PresenceController.class);

    private final PresenceService service;
    private final PresenceAuthRateLimitService authRateLimit;
    private final PresenceAnonRateLimitService anonRateLimit;
    private final IpResolver ipResolver;

    public PresenceController(PresenceService service,
                              PresenceAuthRateLimitService authRateLimit,
                              PresenceAnonRateLimitService anonRateLimit,
                              IpResolver ipResolver) {
        this.service = service;
        this.authRateLimit = authRateLimit;
        this.anonRateLimit = anonRateLimit;
        this.ipResolver = ipResolver;
    }

    @GetMapping("/presence")
    public ResponseEntity<ProxyResponse<PresenceResponse>> getPresence(
            @AuthenticationPrincipal AuthenticatedUser principal,
            HttpServletRequest request) {
        if (principal != null) {
            authRateLimit.checkAndConsume(principal.userId());
        } else {
            anonRateLimit.checkAndConsume(ipResolver.resolve(request));
        }
        PresenceResponse body = service.getCount();
        log.info("presenceCountRequested count={} principal={}",
            body.count(), principal != null ? "auth" : "anon");
        return ResponseEntity.ok(ProxyResponse.of(body, MDC.get("requestId")));
    }
}
