package com.worshiproom.quicklift;

import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.proxy.common.ProxyResponse;
import com.worshiproom.quicklift.dto.QuickLiftCompleteResponse;
import com.worshiproom.quicklift.dto.QuickLiftStartRequest;
import com.worshiproom.quicklift.dto.QuickLiftStartResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * HTTP boundary for Quick Lift (Spec 6.2). Two endpoints:
 * <ul>
 *   <li>{@code POST /api/v1/quick-lift/start} — open a session.</li>
 *   <li>{@code POST /api/v1/quick-lift/{sessionId}/complete} — mark a session
 *       complete after the 30-second server-authoritative dwell.</li>
 * </ul>
 * Both require JWT auth (rules wired in {@code SecurityConfig}).
 */
@RestController
@RequestMapping("/api/v1/quick-lift")
public class QuickLiftController {

    private static final Logger log = LoggerFactory.getLogger(QuickLiftController.class);

    private final QuickLiftService quickLiftService;

    public QuickLiftController(QuickLiftService quickLiftService) {
        this.quickLiftService = quickLiftService;
    }

    @PostMapping("/start")
    public ResponseEntity<ProxyResponse<QuickLiftStartResponse>> start(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody QuickLiftStartRequest request) {
        log.info("Quick Lift start request postId={}", request.postId());
        QuickLiftStartResponse payload = quickLiftService.start(principal.userId(), request.postId());
        return ResponseEntity.ok(ProxyResponse.of(payload, MDC.get("requestId")));
    }

    @PostMapping("/{sessionId}/complete")
    public ResponseEntity<ProxyResponse<QuickLiftCompleteResponse>> complete(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID sessionId) {
        log.info("Quick Lift complete request sessionId={}", sessionId);
        QuickLiftCompleteResponse payload = quickLiftService.complete(principal.userId(), sessionId);
        return ResponseEntity.ok(ProxyResponse.of(payload, MDC.get("requestId")));
    }
}
