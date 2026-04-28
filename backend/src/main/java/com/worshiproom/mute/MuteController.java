package com.worshiproom.mute;

import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.mute.dto.MuteUserRequest;
import com.worshiproom.mute.dto.MutedUserDto;
import com.worshiproom.proxy.common.ProxyResponse;
import jakarta.validation.Valid;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * HTTP layer for mute operations — Spec 2.5.7. All endpoints require JWT auth.
 *
 * <p>Per Divergence 2, paths are under {@code /api/v1/mutes/*} (NOT
 * {@code /api/v1/users/me/mutes/*}). The master plan stub explicitly chose
 * the shorter namespace; honored here verbatim.
 */
@RestController
public class MuteController {

    private final MuteService muteService;

    public MuteController(MuteService muteService) {
        this.muteService = muteService;
    }

    // 1. POST /api/v1/mutes
    @PostMapping("/api/v1/mutes")
    public ResponseEntity<ProxyResponse<Map<String, Object>>> muteUser(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody MuteUserRequest body) {
        muteService.muteUser(principal.userId(), body.userId());
        // mutedAt is computed in the controller (post-service). Service is void;
        // idempotent semantic doesn't return the row's actual created_at. Drift
        // sub-millisecond. Same shape as blockUser.
        Map<String, Object> data = Map.of(
            "mutedUserId", body.userId().toString(),
            "mutedAt", OffsetDateTime.now(ZoneOffset.UTC).toString()
        );
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ProxyResponse.of(data, MDC.get("requestId")));
    }

    // 2. DELETE /api/v1/mutes/{userId}
    @DeleteMapping("/api/v1/mutes/{userId}")
    public ResponseEntity<Void> unmuteUser(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID userId) {
        muteService.unmuteUser(principal.userId(), userId);
        return ResponseEntity.noContent().build();
    }

    // 3. GET /api/v1/mutes
    @GetMapping("/api/v1/mutes")
    public ResponseEntity<ProxyResponse<List<MutedUserDto>>> listMutes(
            @AuthenticationPrincipal AuthenticatedUser principal) {
        List<MutedUserDto> mutes = muteService.listMutedUsers(principal.userId());
        return ResponseEntity.ok(ProxyResponse.of(mutes, MDC.get("requestId")));
    }
}
