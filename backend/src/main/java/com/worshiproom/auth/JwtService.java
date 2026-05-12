package com.worshiproom.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.WeakKeyException;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private static final int MIN_SECRET_BYTES = 32; // HS256 requires 256-bit key

    private final JwtConfig config;
    private SecretKey signingKey;

    public JwtService(JwtConfig config) {
        this.config = config;
    }

    @PostConstruct
    void validateAndInitialize() {
        if (config.getSecret() == null || config.getSecret().isBlank()) {
            throw new IllegalStateException(
                "JWT_SECRET is not configured. Set the JWT_SECRET environment variable " +
                "(at least 32 bytes) or provide jwt.secret in a dev profile fallback."
            );
        }
        byte[] secretBytes = config.getSecret().getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                "JWT_SECRET must be at least " + MIN_SECRET_BYTES + " bytes for HS256. Got " +
                secretBytes.length + " bytes."
            );
        }
        try {
            this.signingKey = Keys.hmacShaKeyFor(secretBytes);
        } catch (WeakKeyException e) {
            throw new IllegalStateException("JWT secret is too weak: " + e.getMessage(), e);
        }
    }

    /**
     * Test-fixture overload — synthesizes a token with {@code gen=0}. Production
     * code MUST call the 3-arg overload with the real {@code users.session_generation}
     * value; this form exists so the ~40 pre-1.5g test call sites continue to compile
     * unchanged. {@code gen=0} matches the DB column default for newly-created users,
     * so the filter check passes for tests that don't exercise session-generation
     * mismatch scenarios. Mirrors the {@code AuthenticatedUser} 2-arg secondary
     * constructor pattern (Decision 1).
     */
    public String generateToken(UUID userId, boolean isAdmin) {
        return generateToken(userId, isAdmin, 0);
    }

    /**
     * Forums Wave Spec 1.5g — issue a signed JWT carrying {@code jti} (random
     * per-call UUID) and {@code gen} (caller-supplied session generation).
     *
     * <p>The {@code jti} is the lookup key for the revocation blocklist
     * ({@code jwt_blocklist} + Redis). The {@code gen} is the caller-side
     * snapshot of {@code users.session_generation} at issue time; the auth
     * filter rejects any token whose claim no longer matches the row value
     * (the password-change and logout-all flows bump the row counter).
     *
     * <p>{@code jti} is generated INSIDE this method and is NOT derivable from
     * {@code userId} (cryptographic unpredictability is a property of the
     * blocklist, not a coincidence).
     */
    public String generateToken(UUID userId, boolean isAdmin, int sessionGeneration) {
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(config.getExpirationSeconds());
        UUID jti = UUID.randomUUID();
        return Jwts.builder()
            .id(jti.toString())
            .subject(userId.toString())
            .claim("is_admin", isAdmin)
            .claim("gen", sessionGeneration)
            .issuedAt(Date.from(now))
            .expiration(Date.from(exp))
            .signWith(signingKey, Jwts.SIG.HS256)
            .compact();
    }

    /**
     * Parses and validates a signed JWT. Throws specific JJWT exception types
     * that the calling filter maps to error codes:
     *   ExpiredJwtException    → TOKEN_EXPIRED
     *   SignatureException     → TOKEN_INVALID
     *   MalformedJwtException  → TOKEN_MALFORMED
     *   Any other JwtException → TOKEN_INVALID (conservative)
     */
    public Jws<Claims> parseToken(String token) {
        return Jwts.parser()
            .verifyWith(signingKey)
            .build()
            .parseSignedClaims(token);
    }
}
