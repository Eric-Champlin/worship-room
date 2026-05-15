package com.worshiproom.presence;

import com.worshiproom.presence.dto.PresenceResponse;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.support.TestContainers;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Spec 6.11b — integration test for {@link PresenceService} backed by the
 * Testcontainers Redis singleton + Postgres singleton.
 *
 * <p>Cache assertions use {@link CacheManager#getCache(String)#clear()} to flush
 * between recompute steps because the test profile uses
 * {@code ConcurrentMapCacheManager} (no TTL).
 */
class PresenceServiceTest extends AbstractIntegrationTest {

    @DynamicPropertySource
    static void registerRedisProps(DynamicPropertyRegistry registry) {
        TestContainers.registerRedisProperties(registry);
    }

    @Autowired private PresenceService service;
    @Autowired private RedisTemplate<String, String> redisTemplate;
    @Autowired private PresenceProperties props;
    @Autowired private UserRepository userRepository;
    @Autowired private CacheManager cacheManager;

    @BeforeEach
    void setup() {
        redisTemplate.delete(props.getSortedSetKey());
        userRepository.deleteAll();
        flushCache();
    }

    @AfterEach
    void teardown() {
        redisTemplate.delete(props.getSortedSetKey());
        userRepository.deleteAll();
    }

    private void flushCache() {
        Cache c = cacheManager.getCache("prayer-wall-presence");
        if (c != null) c.clear();
    }

    @Test
    void bumpUserAddsMemberWithCurrentScore() {
        UUID userId = UUID.randomUUID();
        long before = Instant.now().getEpochSecond();
        service.bumpUser(userId);
        long after = Instant.now().getEpochSecond();

        Double score = redisTemplate.opsForZSet().score(props.getSortedSetKey(), "user:" + userId);
        assertThat(score).isNotNull();
        assertThat(score.longValue()).isBetween(before, after);
    }

    @Test
    void bumpAnonAddsMemberWithCurrentScore() {
        String sessionId = UUID.randomUUID().toString();
        service.bumpAnon(sessionId);

        Double score = redisTemplate.opsForZSet().score(props.getSortedSetKey(), "anon:" + sessionId);
        assertThat(score).isNotNull();
    }

    @Test
    void bumpUserIsIdempotentAcrossTabs() {
        UUID userId = UUID.randomUUID();
        service.bumpUser(userId);
        service.bumpUser(userId);
        Long size = redisTemplate.opsForZSet().zCard(props.getSortedSetKey());
        assertThat(size).isEqualTo(1L);
    }

    @Test
    void getCountReturnsZeroWhenNoMembers() {
        PresenceResponse r = service.getCount();
        assertThat(r.count()).isZero();
    }

    @Test
    void getCountReturnsCountOfFreshMembers() {
        service.bumpUser(UUID.randomUUID());
        service.bumpAnon(UUID.randomUUID().toString());
        service.bumpAnon(UUID.randomUUID().toString());
        flushCache();

        PresenceResponse r = service.getCount();
        assertThat(r.count()).isEqualTo(3);
    }

    @Test
    void getCountExcludesStaleMembers() {
        // Seed 1 fresh, 2 stale (way before TTL window)
        long now = Instant.now().getEpochSecond();
        long stale = now - 4000;
        service.bumpUser(UUID.randomUUID());
        redisTemplate.opsForZSet().add(props.getSortedSetKey(), "anon:stale-1", stale);
        redisTemplate.opsForZSet().add(props.getSortedSetKey(), "anon:stale-2", stale);
        flushCache();

        PresenceResponse r = service.getCount();
        assertThat(r.count()).isEqualTo(1);
    }

    @Test
    void getCountExcludesOptedOutUsers() {
        User a = userRepository.save(new User("opt-a@example.com", "$2a$10$x", "A", "A", "UTC"));
        User b = userRepository.save(new User("opt-b@example.com", "$2a$10$x", "B", "B", "UTC"));
        a.setPresenceOptedOut(true);
        userRepository.save(a);

        service.bumpUser(a.getId());
        service.bumpUser(b.getId());
        flushCache();

        PresenceResponse r = service.getCount();
        assertThat(r.count()).isEqualTo(1);
    }

    @Test
    void getCountSkipsMalformedMembers() {
        // Inject a malformed member directly
        long now = Instant.now().getEpochSecond();
        redisTemplate.opsForZSet().add(props.getSortedSetKey(), "user:not-a-uuid", now);
        flushCache();

        PresenceResponse r = service.getCount();
        assertThat(r.count()).isZero();
    }

    @Test
    void getCountIsCachedBetweenCalls() {
        UUID first = UUID.randomUUID();
        service.bumpUser(first);
        flushCache();
        PresenceResponse r1 = service.getCount();
        assertThat(r1.count()).isEqualTo(1);

        // Add a second user — should NOT be visible until cache is flushed.
        service.bumpUser(UUID.randomUUID());
        PresenceResponse r2 = service.getCount();
        assertThat(r2.count()).isEqualTo(1);  // cached snapshot

        // After flush, the new count appears.
        flushCache();
        PresenceResponse r3 = service.getCount();
        assertThat(r3.count()).isEqualTo(2);
    }

    @Test
    void cleanupRemovesStaleMembers() {
        long now = Instant.now().getEpochSecond();
        long stale = now - 4000;
        for (int i = 0; i < 5; i++) {
            redisTemplate.opsForZSet().add(props.getSortedSetKey(), "anon:stale-" + i, stale);
        }
        service.bumpUser(UUID.randomUUID());
        service.bumpAnon(UUID.randomUUID().toString());

        long removed = service.cleanup();
        assertThat(removed).isEqualTo(5);
        Long remaining = redisTemplate.opsForZSet().zCard(props.getSortedSetKey());
        assertThat(remaining).isEqualTo(2L);
    }

    @Test
    void bumpUserNullIsSafe() {
        service.bumpUser(null);
        Long size = redisTemplate.opsForZSet().zCard(props.getSortedSetKey());
        assertThat(size).isZero();
    }

    @Test
    void bumpAnonEmptyOrNullIsSafe() {
        service.bumpAnon(null);
        service.bumpAnon("");
        Long size = redisTemplate.opsForZSet().zCard(props.getSortedSetKey());
        assertThat(size).isZero();
    }
}
