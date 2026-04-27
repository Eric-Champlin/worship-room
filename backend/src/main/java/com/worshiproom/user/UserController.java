package com.worshiproom.user;

import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.friends.FriendsService;
import com.worshiproom.friends.dto.UserSearchResultDto;
import com.worshiproom.proxy.common.ProxyResponse;
import com.worshiproom.user.dto.UpdateUserRequest;
import com.worshiproom.user.dto.UserResponse;
import jakarta.validation.Valid;
import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;
    private final FriendsService friendsService;

    public UserController(UserService userService, FriendsService friendsService) {
        this.userService = userService;
        this.friendsService = friendsService;
    }

    @GetMapping("/me")
    public ResponseEntity<ProxyResponse<UserResponse>> getMe(
            @AuthenticationPrincipal AuthenticatedUser principal) {
        UserResponse body = userService.getCurrentUser(principal.userId());
        return ResponseEntity.ok(ProxyResponse.of(body, MDC.get("requestId")));
    }

    @PatchMapping("/me")
    public ResponseEntity<ProxyResponse<UserResponse>> updateMe(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody UpdateUserRequest request) {
        UserResponse body = userService.updateCurrentUser(principal.userId(), request);
        return ResponseEntity.ok(ProxyResponse.of(body, MDC.get("requestId")));
    }

    /**
     * GET /api/v1/users/search — search for users by name prefix.
     *
     * <p>Per Spec 2.5.3 Divergence 2, this endpoint lives on UserController (not
     * FriendsController) for URL-namespace cohesion: {@code /api/v1/users/me/...}
     * and {@code /api/v1/users/search} both belong to the user namespace. The
     * implementation delegates to {@link FriendsService#searchUsers} which
     * already enforces query-length validation, blocked-user exclusion, and
     * caller-self exclusion.
     *
     * <p>Friends-domain exceptions (e.g., {@link com.worshiproom.friends.InvalidInputException}
     * when {@code q} < 2 chars) bubble through this user-package controller and are
     * caught by the unscoped {@link com.worshiproom.friends.FriendsExceptionHandler}.
     */
    @GetMapping("/search")
    public ResponseEntity<ProxyResponse<List<UserSearchResultDto>>> searchUsers(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "limit", defaultValue = "20") int limit) {
        // q is intentionally optional at the controller layer — FriendsService.searchUsers
        // throws InvalidInputException for null/empty/<2-char queries (caught by the
        // unscoped FriendsExceptionHandler). Centralising query validation in the service
        // keeps the cross-package error surface consistent: missing-q and short-q both
        // return 400 INVALID_INPUT.
        List<UserSearchResultDto> results =
            friendsService.searchUsers(principal.userId(), q, limit);
        return ResponseEntity.ok(ProxyResponse.of(results, MDC.get("requestId")));
    }
}
