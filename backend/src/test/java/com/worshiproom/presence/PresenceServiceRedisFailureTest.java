package com.worshiproom.presence;

import com.worshiproom.presence.dto.PresenceResponse;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Spec 6.11b graceful-Redis-fallback unit tests.
 *
 * <p>Complements {@link PresenceServiceTest} (Testcontainers integration tests
 * with real Redis). This class uses pure Mockito to simulate Redis failures
 * that Testcontainers cannot easily reproduce — connection refused, socket
 * timeout, RedisConnectionFailureException — and asserts the service returns
 * safe defaults rather than propagating the exception.
 */
@ExtendWith(MockitoExtension.class)
class PresenceServiceRedisFailureTest {

    @Mock private RedisTemplate<String, String> redisTemplate;
    @Mock private ZSetOperations<String, String> zSetOps;
    @Mock private UserRepository userRepository;

    private PresenceProperties props;
    private PresenceService service;

    @BeforeEach
    void setUp() {
        props = new PresenceProperties();
        service = new PresenceService(redisTemplate, props, userRepository);
        when(redisTemplate.opsForZSet()).thenReturn(zSetOps);
    }

    @Test
    void getCountReturnsZeroWhenRedisUnreachable() {
        when(zSetOps.rangeByScore(anyString(), anyDouble(), anyDouble()))
            .thenThrow(new RedisConnectionFailureException("simulated redis down"));

        PresenceResponse response = service.getCount();

        assertThat(response.count()).isZero();
        // Postgres should not be touched when the ZSET read failed.
        verifyNoInteractions(userRepository);
    }

    @Test
    void bumpUserSwallowsRedisFailure() {
        when(zSetOps.add(anyString(), anyString(), anyDouble()))
            .thenThrow(new RedisConnectionFailureException("simulated redis down"));

        assertThatCode(() -> service.bumpUser(UUID.randomUUID()))
            .doesNotThrowAnyException();
    }

    @Test
    void bumpAnonSwallowsRedisFailure() {
        when(zSetOps.add(anyString(), anyString(), anyDouble()))
            .thenThrow(new RedisConnectionFailureException("simulated redis down"));

        assertThatCode(() -> service.bumpAnon("session-" + UUID.randomUUID()))
            .doesNotThrowAnyException();
    }

    @Test
    void cleanupReturnsZeroWhenRedisUnreachable() {
        when(zSetOps.removeRangeByScore(anyString(), anyDouble(), anyDouble()))
            .thenThrow(new RedisConnectionFailureException("simulated redis down"));

        long removed = service.cleanup();

        assertThat(removed).isZero();
    }
}
