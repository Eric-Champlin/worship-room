package com.worshiproom.social;

import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.proxy.common.ProxyResponse;
import com.worshiproom.social.dto.RecapDismissalRequest;
import com.worshiproom.social.dto.SendEncouragementRequest;
import com.worshiproom.social.dto.SendNudgeRequest;
import jakarta.validation.Valid;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * HTTP layer for social write operations — Spec 2.5.4b.
 *
 * <p>All endpoints require JWT auth and return write-only responses
 * ({@code id} + {@code createdAt}). Reads stay localStorage-driven during
 * Phase 2.5; future phases add corresponding GET endpoints.
 */
@RestController
@RequestMapping("/api/v1/social")
public class SocialController {

    private final SocialInteractionsService service;

    public SocialController(SocialInteractionsService service) {
        this.service = service;
    }

    @PostMapping("/encouragements")
    public ResponseEntity<ProxyResponse<Map<String, Object>>> sendEncouragement(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody SendEncouragementRequest body) {
        SocialInteraction row = service.sendEncouragement(
            principal.userId(), body.toUserId(), body.message());
        return responseFor(row);
    }

    @PostMapping("/nudges")
    public ResponseEntity<ProxyResponse<Map<String, Object>>> sendNudge(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody SendNudgeRequest body) {
        SocialInteraction row = service.sendNudge(principal.userId(), body.toUserId());
        return responseFor(row);
    }

    @PostMapping("/recap-dismissal")
    public ResponseEntity<ProxyResponse<Map<String, Object>>> dismissRecap(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody RecapDismissalRequest body) {
        SocialInteraction row = service.dismissRecap(principal.userId(), body.weekStart());
        return responseFor(row);
    }

    private ResponseEntity<ProxyResponse<Map<String, Object>>> responseFor(SocialInteraction row) {
        Map<String, Object> data = Map.of(
            "id", row.getId().toString(),
            "createdAt", row.getCreatedAt().toString()
        );
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ProxyResponse.of(data, MDC.get("requestId")));
    }
}
