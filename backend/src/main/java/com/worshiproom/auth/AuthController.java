package com.worshiproom.auth;

import com.worshiproom.auth.dto.AuthResponse;
import com.worshiproom.auth.dto.ChangePasswordRequest;
import com.worshiproom.auth.dto.ChangePasswordResponse;
import com.worshiproom.auth.dto.LoginRequest;
import com.worshiproom.auth.dto.RegisterRequest;
import com.worshiproom.auth.dto.RegisterResponse;
import com.worshiproom.proxy.common.IpResolver;
import com.worshiproom.proxy.common.ProxyResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.MDC;
import org.springframework.http.HttpHeaders;
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
    private final IpResolver ipResolver;

    public AuthController(AuthService authService, IpResolver ipResolver) {
        this.authService = authService;
        this.ipResolver = ipResolver;
    }

    @PostMapping("/register")
    public ResponseEntity<ProxyResponse<RegisterResponse>> register(@Valid @RequestBody RegisterRequest request) {
        RegisterResponse body = authService.register(request);
        return ResponseEntity.ok(ProxyResponse.of(body, MDC.get("requestId")));
    }

    @PostMapping("/login")
    public ResponseEntity<ProxyResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        // Spec 1.5g — pass UA + IP through so AuthService can record an
        // active_sessions row for /settings/sessions. UA stays only in
        // DeviceLabelParser (parsed-then-discarded); IP goes only to
        // GeoIpResolver (offline lookup; never persisted raw).
        String userAgent = httpRequest.getHeader(HttpHeaders.USER_AGENT);
        String ipAddress = ipResolver.resolve(httpRequest);
        AuthResponse body = authService.login(request, userAgent, ipAddress);
        return ResponseEntity.ok(ProxyResponse.of(body, MDC.get("requestId")));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal AuthenticatedUser principal) {
        // Spec 1.5g — endpoint now requires authentication (PublicPaths no longer
        // exempts it) so the filter has matched a JWT and set the principal. The
        // service blocklists principal.jti so subsequent requests with the same
        // token return 401 TOKEN_REVOKED.
        authService.logout(principal);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/change-password")
    public ResponseEntity<ProxyResponse<ChangePasswordResponse>> changePassword(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        // Spec 1.5g — response shape changed from 204 No Content to 200 OK with
        // a body carrying the freshly-issued JWT. Frontend's changePasswordApi
        // calls setStoredToken(data.token) so this device continues seamlessly
        // while other devices are signed out via the session_generation bump.
        ChangePasswordResponse body = authService.changePassword(principal.userId(), request);
        return ResponseEntity.ok(ProxyResponse.of(body, MDC.get("requestId")));
    }
}
