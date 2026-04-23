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

    public String generateToken(UUID userId, boolean isAdmin) {
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(config.getExpirationSeconds());
        return Jwts.builder()
            .subject(userId.toString())
            .claim("is_admin", isAdmin)
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
