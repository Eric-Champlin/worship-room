package com.worshiproom.user;

import com.worshiproom.auth.AuthenticatedUser;
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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
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
}
