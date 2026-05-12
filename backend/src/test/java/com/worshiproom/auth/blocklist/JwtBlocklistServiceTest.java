package com.worshiproom.auth.blocklist;

import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link JwtBlocklistService} — dual-write order, fallback
 * semantics, and the {@code invalidateAllForUser} hook (Spec 1.5g, MPD-2 + MPD-7).
 */
@ExtendWith(MockitoExtension.class)
class JwtBlocklistServiceTest {

    @Mock private RedisTemplate<String, String> redisTemplate;
    @Mock private ValueOperations<String, String> valueOps;
    @Mock private JwtBlocklistRepository repository;
    @Mock private UserRepository userRepository;

    private static final Duration MAX_TTL = Duration.ofHours(1);
    private static final Instant FIXED_NOW = Instant.parse("2026-05-12T12:00:00Z");

    private JwtBlocklistService service;

    @BeforeEach
    void setUp() {
        Clock fixedClock = Clock.fixed(FIXED_NOW, ZoneOffset.UTC);
        service = new JwtBlocklistService(redisTemplate, repository, userRepository, fixedClock);
    }

    @Test
    @DisplayName("revoke writes Postgres FIRST, then Redis (Decision 3)")
    void revoke_postgresFirstThenRedis() {
        UUID jti = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        OffsetDateTime exp = OffsetDateTime.ofInstant(FIXED_NOW.plusSeconds(1800), ZoneOffset.UTC);
        when(repository.existsById(jti)).thenReturn(false);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);

        service.revoke(jti, userId, exp, MAX_TTL);

        InOrder order = inOrder(repository, valueOps);
        order.verify(repository).save(any(JwtBlocklistEntry.class));
        order.verify(valueOps).set(eq("jwt:blocklist:" + jti), eq("1"), anyLong(), eq(TimeUnit.SECONDS));
    }

    @Test
    @DisplayName("revoke is idempotent on the Postgres side (skip if jti already present)")
    void revoke_idempotentOnPostgres() {
        UUID jti = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        OffsetDateTime exp = OffsetDateTime.ofInstant(FIXED_NOW.plusSeconds(1800), ZoneOffset.UTC);
        when(repository.existsById(jti)).thenReturn(true);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);

        service.revoke(jti, userId, exp, MAX_TTL);

        verify(repository, never()).save(any(JwtBlocklistEntry.class));
        // Redis write still happens — covers the case where the entry exists
        // in Postgres but Redis lost it (eviction, restart).
        verify(valueOps).set(any(), any(), anyLong(), eq(TimeUnit.SECONDS));
    }

    @Test
    @DisplayName("revoke proceeds even if Redis write fails (Postgres is source of truth)")
    void revoke_redisFailureDoesNotPropagate() {
        UUID jti = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        OffsetDateTime exp = OffsetDateTime.ofInstant(FIXED_NOW.plusSeconds(1800), ZoneOffset.UTC);
        when(repository.existsById(jti)).thenReturn(false);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        doThrow(new RedisConnectionFailureException("redis down"))
            .when(valueOps).set(any(), any(), anyLong(), eq(TimeUnit.SECONDS));

        // Should NOT throw — Postgres write already committed.
        service.revoke(jti, userId, exp, MAX_TTL);

        verify(repository).save(any(JwtBlocklistEntry.class));
    }

    @Test
    @DisplayName("revoke clamps TTL to MIN_TTL_SECONDS for near-expired tokens")
    void revoke_clampsTtlForExpiredTokens() {
        UUID jti = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        // exp 10 seconds in the past
        OffsetDateTime exp = OffsetDateTime.ofInstant(FIXED_NOW.minusSeconds(10), ZoneOffset.UTC);
        when(repository.existsById(jti)).thenReturn(false);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);

        service.revoke(jti, userId, exp, MAX_TTL);

        verify(valueOps).set(eq("jwt:blocklist:" + jti), eq("1"), eq(60L), eq(TimeUnit.SECONDS));
    }

    @Test
    @DisplayName("isRevoked returns true on Redis hit without consulting Postgres")
    void isRevoked_redisHitSkipsPostgres() {
        UUID jti = UUID.randomUUID();
        when(redisTemplate.hasKey("jwt:blocklist:" + jti)).thenReturn(true);

        assertThat(service.isRevoked(jti)).isTrue();
        verify(repository, never()).existsById(any());
    }

    @Test
    @DisplayName("isRevoked falls through to Postgres on Redis miss (Redis-MISS != not-revoked)")
    void isRevoked_redisMissFallsThroughToPostgres() {
        UUID jti = UUID.randomUUID();
        when(redisTemplate.hasKey("jwt:blocklist:" + jti)).thenReturn(false);
        when(repository.existsById(jti)).thenReturn(true);

        assertThat(service.isRevoked(jti)).isTrue();
        verify(repository).existsById(jti);
    }

    @Test
    @DisplayName("isRevoked falls back to Postgres on Redis exception")
    void isRevoked_redisExceptionFallsBackToPostgres() {
        UUID jti = UUID.randomUUID();
        when(redisTemplate.hasKey("jwt:blocklist:" + jti))
            .thenThrow(new RedisConnectionFailureException("redis down"));
        when(repository.existsById(jti)).thenReturn(true);

        assertThat(service.isRevoked(jti)).isTrue();
        verify(repository).existsById(jti);
    }

    @Test
    @DisplayName("isRevoked propagates Postgres exception (filter fails closed)")
    void isRevoked_postgresExceptionPropagates() {
        UUID jti = UUID.randomUUID();
        when(redisTemplate.hasKey("jwt:blocklist:" + jti))
            .thenThrow(new RedisConnectionFailureException("redis down"));
        when(repository.existsById(jti))
            .thenThrow(new IllegalStateException("postgres down"));

        try {
            service.isRevoked(jti);
            throw new AssertionError("Expected propagation but call returned");
        } catch (IllegalStateException e) {
            assertThat(e.getMessage()).isEqualTo("postgres down");
        }
    }

    @Test
    @DisplayName("invalidateAllForUser delegates to UserRepository.incrementSessionGeneration (MPD-7)")
    void invalidateAllForUser_incrementsSessionGeneration() {
        UUID userId = UUID.randomUUID();
        when(userRepository.incrementSessionGeneration(userId)).thenReturn(3);

        int newGen = service.invalidateAllForUser(userId);

        assertThat(newGen).isEqualTo(3);
        verify(userRepository).incrementSessionGeneration(userId);
    }
}
