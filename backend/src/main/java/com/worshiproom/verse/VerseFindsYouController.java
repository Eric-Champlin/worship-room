package com.worshiproom.verse;

import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.verse.dto.VerseDto;
import com.worshiproom.verse.dto.VerseFindsYouResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Spec 6.8 endpoint: {@code GET /api/v1/verse-finds-you}.
 *
 * <p>Auth required (SecurityConfig rule above {@code OPTIONAL_AUTH_PATTERNS}).
 * Per-user rate limit 10/hr via {@link VerseFindsYouRateLimitService}.
 * Trigger-param parsing happens at the boundary; invalid values throw
 * {@link InvalidTriggerException} (400 INVALID_INPUT).
 *
 * <p>The {@code enabled} query param is the pre-Phase-12 client-side settings flag
 * (Plan-Time Divergence #4). Default {@code false} so a missing param respects
 * Gate-G-DEFAULT-OFF.
 *
 * <p>Logging discipline: NEVER log verse text or post body (07-logging-monitoring.md
 * § PII boundary). Safe-to-log: userId, trigger, context, enabled, reason.
 */
@RestController
@RequestMapping("/api/v1")
public class VerseFindsYouController {

    private static final Logger log = LoggerFactory.getLogger(VerseFindsYouController.class);

    private final VerseFindsYouService service;
    private final VerseFindsYouRateLimitService rateLimit;

    public VerseFindsYouController(VerseFindsYouService service,
                                   VerseFindsYouRateLimitService rateLimit) {
        this.service = service;
        this.rateLimit = rateLimit;
    }

    @GetMapping("/verse-finds-you")
    public ResponseEntity<VerseFindsYouResponse> get(
        @AuthenticationPrincipal AuthenticatedUser principal,
        @RequestParam("trigger") String trigger,
        @RequestParam(value = "context", required = false) String context,
        @RequestParam(value = "enabled", required = false, defaultValue = "false") boolean enabled
    ) {
        UUID userId = principal.userId();
        rateLimit.checkAndConsume(userId);

        TriggerType triggerType;
        try {
            triggerType = TriggerType.fromQueryParam(trigger);
        } catch (IllegalArgumentException e) {
            throw new InvalidTriggerException(trigger);
        }

        log.info("verseFindsYouRequested userId={} trigger={} context={} enabled={}",
            userId, trigger, context, enabled);

        SurfacingResult result = service.surface(userId, triggerType, context, enabled);

        VerseFindsYouResponse body = new VerseFindsYouResponse(
            result.verse().map(v -> new VerseDto(v.reference(), v.text())).orElse(null),
            result.cooldownUntil(),
            result.reason() == null ? null : result.reason().name().toLowerCase()
        );

        log.info("verseFindsYouResolved userId={} trigger={} reason={} surfaced={}",
            userId, trigger, body.reason(), body.verse() != null);

        return ResponseEntity.ok(body);
    }
}
