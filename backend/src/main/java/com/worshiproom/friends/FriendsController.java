package com.worshiproom.friends;

import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.friends.dto.BlockUserRequest;
import com.worshiproom.friends.dto.FriendDto;
import com.worshiproom.friends.dto.FriendRequestDto;
import com.worshiproom.friends.dto.RespondToFriendRequestRequest;
import com.worshiproom.friends.dto.SendFriendRequestRequest;
import com.worshiproom.proxy.common.ProxyResponse;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import jakarta.validation.Valid;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * HTTP layer for friends operations — Spec 2.5.3.
 *
 * <p>All endpoints require JWT auth. Path prefixes vary
 * ({@code /users/me/friends}, {@code /friend-requests/{id}},
 * {@code /users/me/blocks}) so per-method mappings are used instead of a
 * class-level {@code @RequestMapping}. The eighth endpoint, user-search,
 * lives on {@link com.worshiproom.user.UserController} per Divergence 2.
 */
@RestController
public class FriendsController {

    /**
     * Cached system clock — {@link Clock} instances are immutable and thread-safe, so a
     * single shared reference is safe and avoids per-request allocation in
     * {@link #listFriends}.
     */
    private static final Clock SYSTEM_CLOCK = Clock.systemDefaultZone();

    private final FriendsService friendsService;
    private final UserRepository userRepository;

    public FriendsController(FriendsService friendsService, UserRepository userRepository) {
        this.friendsService = friendsService;
        this.userRepository = userRepository;
    }

    // 1. GET /api/v1/users/me/friends
    @GetMapping("/api/v1/users/me/friends")
    public ResponseEntity<ProxyResponse<List<FriendDto>>> listFriends(
            @AuthenticationPrincipal AuthenticatedUser principal) {
        // 404 USER_NOT_FOUND when the JWT-authenticated caller's record is missing — a race
        // with account deletion. The 404 mapping is consistent with the rest of the friends
        // domain; re-auth is the frontend's responsibility once the auth state propagates.
        User caller = userRepository.findById(principal.userId())
            .orElseThrow(() -> new UserNotFoundException("Caller not found"));
        OffsetDateTime weekStart = WeekStartCalculator.monday00InZone(
            ZoneId.of(caller.getTimezone()), SYSTEM_CLOCK);
        List<FriendDto> friends = friendsService.listFriends(principal.userId(), weekStart);
        return ResponseEntity.ok(ProxyResponse.of(friends, MDC.get("requestId")));
    }

    // 2. GET /api/v1/users/me/friend-requests?direction=incoming|outgoing
    @GetMapping("/api/v1/users/me/friend-requests")
    public ResponseEntity<ProxyResponse<List<FriendRequestDto>>> listFriendRequests(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam("direction") String direction) {
        List<FriendRequestDto> requests;
        if ("incoming".equals(direction)) {
            requests = friendsService.listIncomingPendingRequests(principal.userId());
        } else if ("outgoing".equals(direction)) {
            requests = friendsService.listOutgoingPendingRequests(principal.userId());
        } else {
            throw new InvalidInputException(
                "direction must be 'incoming' or 'outgoing'");
        }
        return ResponseEntity.ok(ProxyResponse.of(requests, MDC.get("requestId")));
    }

    // 3. POST /api/v1/users/me/friend-requests
    @PostMapping("/api/v1/users/me/friend-requests")
    public ResponseEntity<ProxyResponse<FriendRequestDto>> sendFriendRequest(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody SendFriendRequestRequest body) {
        FriendRequest req = friendsService.sendRequest(
            principal.userId(), body.toUserId(), body.message());
        // otherPartyDisplayName / otherPartyAvatarUrl are null on the create response — they
        // are only populated by the listIncoming/listOutgoing read paths, which fetch the
        // counterparty via UserRepository. On create, the sender already knows the recipient
        // (they just chose them), so the frontend can re-fetch if it needs the name immediately.
        FriendRequestDto dto = new FriendRequestDto(
            req.getId(),
            req.getFromUserId(),
            req.getToUserId(),
            null, // otherPartyDisplayName
            null, // otherPartyAvatarUrl
            req.getMessage(),
            req.getStatus().value(),
            req.getCreatedAt(),
            req.getRespondedAt()
        );
        URI location = URI.create("/api/v1/friend-requests/" + req.getId());
        return ResponseEntity.created(location)
            .body(ProxyResponse.of(dto, MDC.get("requestId")));
    }

    // 4. PATCH /api/v1/friend-requests/{id}
    @PatchMapping("/api/v1/friend-requests/{id}")
    public ResponseEntity<ProxyResponse<Map<String, String>>> respondToFriendRequest(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id,
            @Valid @RequestBody RespondToFriendRequestRequest body) {
        String newStatus = switch (body.action()) {
            case "accept" -> {
                friendsService.acceptRequest(id, principal.userId());
                yield "accepted";
            }
            case "decline" -> {
                friendsService.declineRequest(id, principal.userId());
                yield "declined";
            }
            case "cancel" -> {
                friendsService.cancelRequest(id, principal.userId());
                yield "cancelled";
            }
            // Defensive default — @Pattern on RespondToFriendRequestRequest.action rejects
            // any value outside the enum at validation time, so this branch is unreachable
            // in practice. Keeping it makes future refactoring (e.g., loosening the @Pattern)
            // safer than a silent fall-through, and preserves a clean 400 to the user
            // rather than a 500 with a programmer-error stack trace.
            default -> throw new InvalidInputException(
                "action must be 'accept', 'decline', or 'cancel'");
        };
        return ResponseEntity.ok(ProxyResponse.of(
            Map.of("status", newStatus), MDC.get("requestId")));
    }

    // 5. DELETE /api/v1/users/me/friends/{friendId}
    @DeleteMapping("/api/v1/users/me/friends/{friendId}")
    public ResponseEntity<Void> removeFriend(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID friendId) {
        friendsService.removeFriend(principal.userId(), friendId);
        return ResponseEntity.noContent().build();
    }

    // 6. POST /api/v1/users/me/blocks
    @PostMapping("/api/v1/users/me/blocks")
    public ResponseEntity<ProxyResponse<Map<String, Object>>> blockUser(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody BlockUserRequest body) {
        friendsService.blockUser(principal.userId(), body.userId());
        // blockedAt is computed in the controller (post-service) rather than read from the
        // persisted block row. This is intentional: FriendsService.blockUser returns void,
        // and there is no GET-by-id endpoint for blocks (only the symmetric DELETE), so the
        // response timestamp is never compared to a stored value. Drift between the actual
        // DB write and this timestamp is sub-millisecond. If a future spec adds GET
        // /blocks/{id}, refactor blockUser to return the persisted entity and use its
        // created_at instead.
        Map<String, Object> data = Map.of(
            "blockedUserId", body.userId().toString(),
            "blockedAt", OffsetDateTime.now(ZoneOffset.UTC).toString()
        );
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ProxyResponse.of(data, MDC.get("requestId")));
    }

    // 7. DELETE /api/v1/users/me/blocks/{userId}
    @DeleteMapping("/api/v1/users/me/blocks/{userId}")
    public ResponseEntity<Void> unblockUser(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID userId) {
        friendsService.unblockUser(principal.userId(), userId);
        return ResponseEntity.noContent().build();
    }
}
