package com.worshiproom.post;

import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.post.dto.IntercessorResponse;
import com.worshiproom.proxy.common.ProxyResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Spec 6.5 — Intercessor Timeline endpoint. Visible to ANY authorized viewer
 * (not just the post author). Distinct from 6.1's PrayerReceiptController
 * (which is author-only) per D-PrivacyContrast.
 *
 * <p>Path: {@code GET /api/v1/posts/{postId}/intercessors}
 * <p>Auth: JWT required (configured in SecurityConfig).
 * <p>Rate limit: 60/min/user.
 *
 * <p><b>Order of operations (mirrors 6.1):</b>
 * <ol>
 *   <li>Rate-limit check (bounds existence-scanning cost)</li>
 *   <li>{@link IntercessorService#buildTimeline} runs visibility check + builds entries</li>
 *   <li>Service throws {@link PostNotFoundException} for missing/deleted/visibility-failed → 404</li>
 * </ol>
 *
 * <p>404 for missing, soft-deleted, moderation-hidden, AND visibility-denied
 * posts — uniform across all viewers. Does NOT distinguish.
 *
 * <p>Response carries {@code Cache-Control: private, no-store} because entries
 * are classified against the viewer's friend set — per-viewer responses MUST
 * NOT be shared across users via any cache layer (Plan-Time Divergence §8).
 */
@RestController
@RequestMapping("/api/v1/posts")
public class IntercessorController {

    private static final Logger log = LoggerFactory.getLogger(IntercessorController.class);

    private final IntercessorService intercessorService;
    private final IntercessorReadRateLimitService rateLimit;

    public IntercessorController(
            IntercessorService intercessorService,
            IntercessorReadRateLimitService rateLimit) {
        this.intercessorService = intercessorService;
        this.rateLimit = rateLimit;
    }

    @GetMapping("/{postId}/intercessors")
    public ResponseEntity<ProxyResponse<IntercessorResponse>> getIntercessors(
            @PathVariable UUID postId,
            @AuthenticationPrincipal AuthenticatedUser viewer
    ) {
        rateLimit.checkAndConsume(viewer.userId());

        IntercessorResponse response = intercessorService.buildTimeline(postId, viewer.userId());
        String requestId = MDC.get("requestId");

        // Aggregate logging only — never per-entry, never userId for anonymous (W6).
        log.info("Intercessors fetched postId={} totalCount={} entriesReturned={} requestId={}",
                postId, response.totalCount(), response.entries().size(), requestId);

        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .body(ProxyResponse.of(response, requestId));
    }
}
