package com.worshiproom.auth.blocklist;

import com.worshiproom.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Dual-write JWT blocklist (Forums Wave Spec 1.5g, MPD-2).
 *
 * <p>Write order: Postgres FIRST, then Redis. Per Decision 3 of the plan, the
 * durable layer is the source of truth — a Postgres success + Redis failure
 * leaves a record that the read path will still see via fallback. The inverse
 * order (Redis-first) would lose the entry on Redis restart between the two
 * writes.
 *
 * <p>Read order: Redis FIRST (fast path), Postgres fallback on any Redis
 * exception. A Postgres failure during the read propagates to the caller so
 * {@code JwtAuthenticationFilter}'s conservative catch-all rejects the token
 * (Gate-G-FAIL-CLOSED: never authenticate when neither layer is reachable).
 *
 * <p>No in-memory fallback — MPD-2 explicitly forbids it. A silent failure of
 * the blocklist would un-revoke previously revoked tokens.
 */
@Service
public class JwtBlocklistService {

    private static final Logger log = LoggerFactory.getLogger(JwtBlocklistService.class);
    private static final String REDIS_KEY_PREFIX = "jwt:blocklist:";
    private static final long MIN_TTL_SECONDS = 60L;
    private static final String SENTINEL_VALUE = "1";

    private final RedisTemplate<String, String> redisTemplate;
    private final JwtBlocklistRepository repository;
    private final UserRepository userRepository;
    private final Clock clock;

    public JwtBlocklistService(RedisTemplate<String, String> redisTemplate,
                               JwtBlocklistRepository repository,
                               UserRepository userRepository,
                               Clock clock) {
        this.redisTemplate = redisTemplate;
        this.repository = repository;
        this.userRepository = userRepository;
        this.clock = clock;
    }

    /**
     * Revoke a single JWT by {@code jti}. Postgres write first (durable),
     * then Redis (fast read path). Redis failure logs a WARN and proceeds —
     * the durable record is enough for correctness; the read-path fallback
     * handles the Redis-degraded case.
     *
     * <p><b>Transactional boundary note:</b> {@code @Transactional} covers
     * the Postgres save only. Redis is not transactional, so the Redis write
     * runs inside the transaction but does NOT roll back if the surrounding
     * transaction does. The dominant failure mode this code targets is the
     * far more common one — Postgres succeeds, Redis fails — which the
     * try/catch handles by leaning on the durable record. The inverse
     * (Redis succeeds, transaction rolls back) leaves a Redis-only entry
     * that expires naturally on its TTL; not strictly incorrect, just briefly
     * over-blocklisted, which is the safer side of the consistency trade.
     *
     * @param maxTtl the JWT's configured lifetime — used to clamp the Redis
     *               TTL so that a token already past its {@code exp} doesn't
     *               linger as a stale blocklist entry.
     */
    @Transactional
    public void revoke(UUID jti, UUID userId, OffsetDateTime expiresAt, Duration maxTtl) {
        // (1) Postgres — source of truth. Idempotent: if jti is already present,
        // saveAndFlush would throw on duplicate PK. Use existsById to skip.
        if (!repository.existsById(jti)) {
            OffsetDateTime now = OffsetDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
            repository.save(new JwtBlocklistEntry(jti, userId, now, expiresAt));
        }

        // (2) Redis — fast read path. TTL = remaining-lifetime, clamped:
        // floor at MIN_TTL_SECONDS (handles already-expired tokens with clock
        // skew), cap at maxTtl (the JWT's full configured lifetime).
        long ttlSec = Duration.between(clock.instant(), expiresAt.toInstant()).getSeconds();
        ttlSec = Math.max(MIN_TTL_SECONDS, Math.min(ttlSec, maxTtl.getSeconds()));
        // Local extraction keeps the nested redisKey(jti) call out of the set(...)
        // argument list — RepoWideTtlEnforcementTest's regex cannot handle nested
        // parens and would otherwise misread the TTL argument count.
        String key = redisKey(jti);
        try {
            redisTemplate.opsForValue().set(key, SENTINEL_VALUE, ttlSec, TimeUnit.SECONDS);
            log.info("blocklistRevoke jti={} userId={} ttlSec={}", jti, userId, ttlSec);
        } catch (RuntimeException e) {
            log.warn("blocklistRedisDegraded jti={} fallingBackToPostgresOnly", jti);
        }
    }

    /**
     * Check whether a JWT's {@code jti} has been revoked. Redis-first read
     * with Postgres fallback. If both fail, propagates the exception so the
     * caller (the auth filter) can fail-closed (Gate-G-FAIL-CLOSED).
     */
    public boolean isRevoked(UUID jti) {
        try {
            Boolean hit = redisTemplate.hasKey(redisKey(jti));
            if (Boolean.TRUE.equals(hit)) {
                return true;
            }
            // Redis miss is authoritative for short-lived revocations because
            // entries are written Postgres-then-Redis and the TTL is shorter
            // than the JWT lifetime — BUT a Redis MISS does NOT mean "not
            // revoked"; Redis could have evicted on restart. Confirm via DB
            // before returning false.
            return repository.existsById(jti);
        } catch (RuntimeException redisFailure) {
            log.warn("blocklistRedisDegraded jti={} fallingBackToPostgres reason={}",
                jti, redisFailure.getClass().getSimpleName());
            // Postgres failure here propagates to caller — filter rejects (Gate-G-FAIL-CLOSED).
            return repository.existsById(jti);
        }
    }

    /**
     * Logout-all extension point (MPD-7) — invalidates every JWT for the
     * user atomically by bumping {@code users.session_generation}. Used by:
     * <ul>
     *   <li>{@code DELETE /api/v1/sessions/all} (this spec)</li>
     *   <li>Spec 1.5b password-reset flow (future) — after a reset email
     *       consumes its token, the reset service calls this to ensure no
     *       previously-issued JWT survives.</li>
     * </ul>
     *
     * <p>This method does NOT enumerate individual JWTs — the session-gen
     * mechanism handles the invalidation O(1) regardless of how many tokens
     * are currently outstanding. Per-jti revocation via {@link #revoke} is
     * still appropriate for single-session logout flows.
     *
     * @return the new {@code session_generation} value
     */
    @Transactional
    public int invalidateAllForUser(UUID userId) {
        int newGen = userRepository.incrementSessionGeneration(userId);
        log.info("invalidateAllForUser userId={} newGen={}", userId, newGen);
        return newGen;
    }

    private static String redisKey(UUID jti) {
        return REDIS_KEY_PREFIX + jti;
    }

    // Visible for advanced callers that need to convert an Instant from JWT
    // exp claim to OffsetDateTime. Convenience only.
    public static OffsetDateTime toUtcOffsetDateTime(Instant instant) {
        return OffsetDateTime.ofInstant(instant, ZoneOffset.UTC);
    }
}
