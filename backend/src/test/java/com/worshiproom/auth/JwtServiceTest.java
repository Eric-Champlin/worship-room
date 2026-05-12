package com.worshiproom.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("JwtService")
class JwtServiceTest {

    private static final String SECRET_32B = "a-32-byte-test-secret-xxxxxxxxxx"; // exactly 32 bytes
    private static final String DEV_FALLBACK =
        "dev-jwt-secret-256-bits-minimum-length-required-for-hs256-algorithm-xxxxxx";

    private static JwtService newService(String secret, long expirationSeconds) {
        JwtConfig config = new JwtConfig();
        config.setSecret(secret);
        config.setExpirationSeconds(expirationSeconds);
        JwtService service = new JwtService(config);
        service.validateAndInitialize();
        return service;
    }

    @Test
    @DisplayName("generated token carries correct subject, iat, exp, is_admin claims")
    void generatesTokenWithCorrectClaims() {
        JwtService service = newService(SECRET_32B, 3600L);
        UUID userId = UUID.randomUUID();
        long before = Instant.now().getEpochSecond();

        String token = service.generateToken(userId, true);
        Jws<Claims> jws = service.parseToken(token);
        Claims claims = jws.getPayload();

        long after = Instant.now().getEpochSecond();

        assertThat(claims.getSubject()).isEqualTo(userId.toString());
        assertThat(claims.get("is_admin", Boolean.class)).isTrue();
        assertThat(claims.getIssuedAt().toInstant().getEpochSecond())
            .isBetween(before - 2, after + 2);
        assertThat(claims.getExpiration().toInstant().getEpochSecond())
            .isBetween(before + 3600 - 2, after + 3600 + 2);
    }

    @Test
    @DisplayName("round-trips a valid token")
    void parsesValidTokenCorrectly() {
        JwtService service = newService(SECRET_32B, 3600L);
        UUID userId = UUID.randomUUID();

        String token = service.generateToken(userId, false);
        Jws<Claims> jws = service.parseToken(token);

        assertThat(jws.getPayload().getSubject()).isEqualTo(userId.toString());
    }

    @Test
    @DisplayName("rejects a token signed with a different secret")
    void rejectsTokenWithWrongSignature() {
        JwtService signerA = newService(SECRET_32B, 3600L);
        JwtService signerB = newService("b-32-byte-test-secret-yyyyyyyyyy", 3600L);
        String tokenFromA = signerA.generateToken(UUID.randomUUID(), false);

        assertThatThrownBy(() -> signerB.parseToken(tokenFromA))
            .isInstanceOf(SignatureException.class);
    }

    @Test
    @DisplayName("rejects an expired token")
    void rejectsExpiredToken() {
        // Build a token with exp in the past using the same signing key.
        byte[] bytes = SECRET_32B.getBytes(StandardCharsets.UTF_8);
        SecretKey key = Keys.hmacShaKeyFor(bytes);
        Instant past = Instant.now().minusSeconds(60);
        String expiredToken = Jwts.builder()
            .subject(UUID.randomUUID().toString())
            .claim("is_admin", false)
            .issuedAt(Date.from(past.minusSeconds(3600)))
            .expiration(Date.from(past))
            .signWith(key, Jwts.SIG.HS256)
            .compact();

        JwtService service = newService(SECRET_32B, 3600L);

        assertThatThrownBy(() -> service.parseToken(expiredToken))
            .isInstanceOf(ExpiredJwtException.class);
    }

    @Test
    @DisplayName("rejects a malformed token")
    void rejectsMalformedToken() {
        JwtService service = newService(SECRET_32B, 3600L);

        assertThatThrownBy(() -> service.parseToken("not.a.jwt"))
            .isInstanceOf(MalformedJwtException.class);
    }

    @Test
    @DisplayName("rejects an empty string token")
    void rejectsEmptyToken() {
        JwtService service = newService(SECRET_32B, 3600L);

        assertThatThrownBy(() -> service.parseToken(""))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("rejects a null token")
    void rejectsNullToken() {
        JwtService service = newService(SECRET_32B, 3600L);

        assertThatThrownBy(() -> service.parseToken(null))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("@PostConstruct fails with null secret")
    void postConstructFailsWithNullSecret() {
        JwtConfig config = new JwtConfig();
        config.setSecret(null);
        JwtService service = new JwtService(config);

        assertThatThrownBy(service::validateAndInitialize)
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("JWT_SECRET is not configured");
    }

    @Test
    @DisplayName("@PostConstruct fails with empty secret")
    void postConstructFailsWithEmptySecret() {
        JwtConfig config = new JwtConfig();
        config.setSecret("");
        JwtService service = new JwtService(config);

        assertThatThrownBy(service::validateAndInitialize)
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("JWT_SECRET is not configured");
    }

    @Test
    @DisplayName("@PostConstruct fails with secret shorter than 32 bytes")
    void postConstructFailsWithShortSecret() {
        JwtConfig config = new JwtConfig();
        config.setSecret("too-short"); // 9 bytes
        JwtService service = new JwtService(config);

        assertThatThrownBy(service::validateAndInitialize)
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("must be at least 32 bytes");
    }

    @Test
    @DisplayName("@PostConstruct accepts the dev fallback secret from application-dev.properties")
    void postConstructAcceptsDevFallbackSecret() {
        JwtConfig config = new JwtConfig();
        config.setSecret(DEV_FALLBACK);
        JwtService service = new JwtService(config);

        // Should not throw
        service.validateAndInitialize();
    }

    @Test
    @DisplayName("is_admin=true round-trips correctly")
    void generatedTokenRoundTripsIsAdminTrue() {
        JwtService service = newService(SECRET_32B, 3600L);
        UUID userId = UUID.randomUUID();

        String token = service.generateToken(userId, true);
        Claims claims = service.parseToken(token).getPayload();

        assertThat(claims.get("is_admin", Boolean.class)).isTrue();
    }

    @Test
    @DisplayName("is_admin=false round-trips correctly")
    void generatedTokenRoundTripsIsAdminFalse() {
        JwtService service = newService(SECRET_32B, 3600L);
        UUID userId = UUID.randomUUID();

        String token = service.generateToken(userId, false);
        Claims claims = service.parseToken(token).getPayload();

        assertThat(claims.get("is_admin", Boolean.class)).isFalse();
    }

    @Test
    @DisplayName("Spec 1.5g: generateToken(uid, isAdmin, gen) emits jti and gen claims")
    void generateToken_includesJtiAndGenClaims() {
        JwtService service = newService(SECRET_32B, 3600L);
        UUID userId = UUID.randomUUID();

        String token = service.generateToken(userId, false, 7);
        Claims claims = service.parseToken(token).getPayload();

        assertThat(claims.getId()).as("jti claim").isNotBlank();
        // jti must round-trip as a valid UUID
        UUID.fromString(claims.getId());
        assertThat(claims.get("gen", Integer.class)).isEqualTo(7);
        assertThat(claims.getSubject()).isEqualTo(userId.toString());
    }

    @Test
    @DisplayName("Spec 1.5g: each generateToken call produces a distinct jti")
    void generateToken_jtiIsUniqueAcrossCalls() {
        JwtService service = newService(SECRET_32B, 3600L);
        UUID userId = UUID.randomUUID();
        java.util.Set<String> jtis = new java.util.HashSet<>();

        for (int i = 0; i < 100; i++) {
            String token = service.generateToken(userId, false, 0);
            jtis.add(service.parseToken(token).getPayload().getId());
        }

        assertThat(jtis).hasSize(100);
    }

    @Test
    @DisplayName("Spec 1.5g: 2-arg overload synthesizes gen=0 (test-fixture convenience)")
    void generateToken_twoArgOverloadDefaultsGenToZero() {
        JwtService service = newService(SECRET_32B, 3600L);
        UUID userId = UUID.randomUUID();

        String token = service.generateToken(userId, false);
        Claims claims = service.parseToken(token).getPayload();

        assertThat(claims.get("gen", Integer.class)).isZero();
        assertThat(claims.getId()).isNotBlank();
    }
}
