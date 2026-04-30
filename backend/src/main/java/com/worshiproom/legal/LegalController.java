package com.worshiproom.legal;

import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.legal.dto.AcceptLegalVersionsRequest;
import com.worshiproom.legal.dto.LegalVersionsResponse;
import com.worshiproom.proxy.common.ProxyResponse;
import com.worshiproom.user.User;
import com.worshiproom.user.UserException;
import com.worshiproom.user.UserRepository;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

/**
 * Spec 1.10f endpoints: read current legal versions (public), and record a
 * user's acceptance of those versions (authenticated, rate-limited).
 *
 * <p>The {@code /me/legal/accept} path is mounted under {@code /api/v1/users}
 * for URL-namespace cohesion with other {@code /me/*} endpoints. Caller ==
 * subject is enforced by Spring Security's principal resolution; the
 * {@code /me/} segment in the URL is documentation, not the authorization
 * mechanism.
 */
@RestController
public class LegalController {

    private static final Logger log = LoggerFactory.getLogger(LegalController.class);

    private final LegalVersionService versionService;
    private final LegalAcceptRateLimitService rateLimitService;
    private final UserRepository userRepository;

    public LegalController(LegalVersionService versionService,
                           LegalAcceptRateLimitService rateLimitService,
                           UserRepository userRepository) {
        this.versionService = versionService;
        this.rateLimitService = rateLimitService;
        this.userRepository = userRepository;
    }

    @GetMapping("/api/v1/legal/versions")
    public ResponseEntity<ProxyResponse<LegalVersionsResponse>> getVersions() {
        LegalVersionsResponse body = new LegalVersionsResponse(
            versionService.currentTermsVersion(),
            versionService.currentPrivacyVersion(),
            versionService.currentCommunityGuidelinesVersion()
        );
        return ResponseEntity.ok(ProxyResponse.of(body, MDC.get("requestId")));
    }

    @PostMapping("/api/v1/users/me/legal/accept")
    @Transactional
    public ResponseEntity<Void> acceptVersions(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody AcceptLegalVersionsRequest request) {

        // Per spec § Watch-for #1: caller == subject is enforced via the JWT
        // principal. The /me/ path segment is for URL clarity; the actual
        // authorization is principal.userId() — never trust a userId from
        // request body or path.
        //
        // Note on rate-limit ordering: @Valid on the request body fires in
        // Spring's argument-resolution phase BEFORE this method body, so
        // structurally malformed payloads (e.g. termsVersion: "not-a-date")
        // 400 with VALIDATION_FAILED without consuming a rate-limit token.
        // That is the intended behavior — Bean Validation is a cheap
        // boundary check at the framework level, and the per-user
        // rate-limit guard fires for every request that gets past it
        // (including version-mismatch attempts). Authenticated bad-format
        // bodies cannot exhaust the bucket; authenticated valid-format
        // bodies (whether mismatched or correct) all consume one token.
        rateLimitService.checkAndConsume(principal.userId());

        if (!versionService.isTermsVersionCurrent(request.termsVersion())) {
            throw new VersionMismatchException();
        }
        if (!versionService.isPrivacyVersionCurrent(request.privacyVersion())) {
            throw new VersionMismatchException();
        }

        User user = userRepository.findById(principal.userId())
            .orElseThrow(UserException::userNotFound);

        user.setTermsVersion(request.termsVersion());
        user.setPrivacyVersion(request.privacyVersion());
        user.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        userRepository.save(user);

        log.info("legalAcceptRecorded userId={} termsVersion={} privacyVersion={}",
            principal.userId(), request.termsVersion(), request.privacyVersion());

        return ResponseEntity.noContent().build();
    }
}
