package com.worshiproom.auth.session;

import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.auth.SessionRateLimitService;
import com.worshiproom.proxy.common.ProxyResponse;
import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Forums Wave Spec 1.5g — endpoints backing {@code /settings/sessions}.
 *
 * <ul>
 *   <li>{@code GET /} — list the current user's sessions (most recent first)</li>
 *   <li>{@code DELETE /{sessionId}} — revoke one session</li>
 *   <li>{@code DELETE /all-others} — revoke every session except current</li>
 *   <li>{@code DELETE /all} — revoke every session including current
 *       (filter rejects this request's token on the NEXT request)</li>
 * </ul>
 *
 * <p>Every endpoint consumes one token from {@link SessionRateLimitService}
 * (per-user, 10/hour by default). All endpoints require authentication
 * (declared in {@code SecurityConfig}). Cross-user revoke returns 403 (NEVER
 * 404; never leak existence of other users' sessions).
 */
@RestController
@RequestMapping("/api/v1/sessions")
public class SessionsController {

    private final ActiveSessionService activeSessionService;
    private final SessionRateLimitService sessionRateLimitService;

    public SessionsController(ActiveSessionService activeSessionService,
                              SessionRateLimitService sessionRateLimitService) {
        this.activeSessionService = activeSessionService;
        this.sessionRateLimitService = sessionRateLimitService;
    }

    @GetMapping
    public ResponseEntity<ProxyResponse<List<SessionResponse>>> listSessions(
            @AuthenticationPrincipal AuthenticatedUser principal) {
        sessionRateLimitService.checkAndConsume(principal.userId());
        List<SessionResponse> sessions = activeSessionService.listSessionsForUser(
            principal.userId(), principal.jti());
        return ResponseEntity.ok(ProxyResponse.of(sessions, MDC.get("requestId")));
    }

    @DeleteMapping("/all")
    public ResponseEntity<Void> revokeAll(@AuthenticationPrincipal AuthenticatedUser principal) {
        sessionRateLimitService.checkAndConsume(principal.userId());
        activeSessionService.revokeAll(principal.userId());
        // 204 even though THIS request's token is now invalidated — the next
        // request from this token fails 401 TOKEN_REVOKED. Frontend handles the
        // redirect after this 204 lands.
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/all-others")
    public ResponseEntity<Void> revokeAllOthers(@AuthenticationPrincipal AuthenticatedUser principal) {
        sessionRateLimitService.checkAndConsume(principal.userId());
        activeSessionService.revokeAllOthers(principal);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{sessionId}")
    public ResponseEntity<Void> revokeSession(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID sessionId) {
        sessionRateLimitService.checkAndConsume(principal.userId());
        activeSessionService.revokeSession(sessionId, principal);
        return ResponseEntity.noContent().build();
    }
}
