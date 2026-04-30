package com.worshiproom.auth;

import com.worshiproom.auth.dto.AuthResponse;
import com.worshiproom.auth.dto.ChangePasswordRequest;
import com.worshiproom.auth.dto.LoginRequest;
import com.worshiproom.auth.dto.RegisterRequest;
import com.worshiproom.auth.dto.RegisterResponse;
import com.worshiproom.proxy.common.ProxyResponse;
import jakarta.validation.Valid;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<ProxyResponse<RegisterResponse>> register(@Valid @RequestBody RegisterRequest request) {
        RegisterResponse body = authService.register(request);
        return ResponseEntity.ok(ProxyResponse.of(body, MDC.get("requestId")));
    }

    @PostMapping("/login")
    public ResponseEntity<ProxyResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse body = authService.login(request);
        return ResponseEntity.ok(ProxyResponse.of(body, MDC.get("requestId")));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        authService.changePassword(principal.userId(), request);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
}
