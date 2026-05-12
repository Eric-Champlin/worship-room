package com.worshiproom.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.support.TestContainers;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.Refill;
import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;

/**
 * Redis-specific scenarios for {@link RedisRateLimiter} (Spec 5.6 Step 8b).
 *
 * <p>Forces the {@code redis} backend via {@code @TestPropertySource} so Spring wires
 * {@link RedisRateLimiter} (not {@link InMemoryRateLimiter}). Avoids {@code @ActiveProfiles("prod")}
 * because that would also require JWT_SECRET, STORAGE_*, and other prod-only env-vars.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "worshiproom.ratelimit.backend=redis"
})
class RedisRateLimiterIntegrationTest extends AbstractIntegrationTest {

    @DynamicPropertySource
    static void registerRedisProps(DynamicPropertyRegistry registry) {
        TestContainers.registerRedisProperties(registry);
    }

    @Autowired RateLimiter rateLimiter;
    @Autowired RedisTemplate<String, String> redisTemplate;

    private static BucketConfiguration cfg(int capacity, Duration window) {
        return BucketConfiguration.builder()
            .addLimit(Bandwidth.classic(capacity, Refill.intervally(capacity, window)))
            .build();
    }

    @Test
    void autowiredRateLimiterIsRedisBacked() {
        assertThat(rateLimiter).isInstanceOf(RedisRateLimiter.class);
    }

    @Test
    void bucketKeysExpireAfterTtl() {
        String key = "test:" + UUID.randomUUID();
        rateLimiter.tryConsume(key, cfg(5, Duration.ofMinutes(1)));
        // RedisRateLimiter prefixes with "rate:"; verify a positive TTL was set.
        Long ttl = redisTemplate.getExpire("rate:" + key);
        assertThat(ttl).isGreaterThan(0L);
    }

    @Test
    void luaScriptHandlesContentionWithoutRaceCondition() throws Exception {
        String key = "test:" + UUID.randomUUID();
        BucketConfiguration cfg = cfg(20, Duration.ofMinutes(1));
        int threads = 50;
        ExecutorService exec = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(1);
        @SuppressWarnings("unchecked")
        Future<Boolean>[] futures = new Future[threads];
        for (int i = 0; i < threads; i++) {
            futures[i] = exec.submit(() -> {
                latch.await();
                return rateLimiter.tryConsume(key, cfg).allowed();
            });
        }
        latch.countDown();
        int admitted = 0;
        for (Future<Boolean> f : futures) {
            if (f.get()) {
                admitted++;
            }
        }
        assertThat(admitted).isEqualTo(20);
        exec.shutdown();
    }

    @Test
    void twoInstanceSimulationSharesState() {
        // Spring owns one RedisRateLimiter bean; simulate a "second instance" by creating
        // a standalone RedisRateLimiter against the same Testcontainer.
        RedisClient secondClient = RedisClient.create(RedisURI.builder()
            .withHost(TestContainers.REDIS.getHost())
            .withPort(TestContainers.REDIS.getMappedPort(6379))
            .build());
        try {
            RateLimiter second = RedisRateLimiter.create(secondClient);
            String key = "test:" + UUID.randomUUID();
            BucketConfiguration cfg = cfg(3, Duration.ofMinutes(1));
            rateLimiter.tryConsume(key, cfg);
            rateLimiter.tryConsume(key, cfg);
            second.tryConsume(key, cfg);
            assertThat(second.tryConsume(key, cfg).allowed()).isFalse();
            assertThat(rateLimiter.tryConsume(key, cfg).allowed()).isFalse();
        } finally {
            secondClient.shutdown();
        }
    }
}
