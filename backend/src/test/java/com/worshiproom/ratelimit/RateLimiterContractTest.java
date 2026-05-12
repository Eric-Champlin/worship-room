package com.worshiproom.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

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
import java.util.function.Supplier;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * LOAD-BEARING contract test (Spec 5.6 / Test 3 / master plan line 4860).
 *
 * <p>Parametrized over {@link InMemoryRateLimiter} and {@link RedisRateLimiter}. Behavioral
 * parity is the contract: same input → same observable {@link RateLimitResult}, modulo
 * cross-instance state (Redis-specific scenario at the bottom).
 */
class RateLimiterContractTest {

    private static RedisClient redisClient;

    @BeforeAll
    static void setupRedis() {
        RedisURI uri = RedisURI.builder()
            .withHost(TestContainers.REDIS.getHost())
            .withPort(TestContainers.REDIS.getMappedPort(6379))
            .build();
        redisClient = RedisClient.create(uri);
    }

    @AfterAll
    static void teardownRedis() {
        if (redisClient != null) {
            redisClient.shutdown();
        }
    }

    static Stream<Arguments> bothImpls() {
        return Stream.of(
            Arguments.of("InMemory",
                (Supplier<RateLimiter>) () -> new InMemoryRateLimiter(10_000)),
            Arguments.of("Redis",
                (Supplier<RateLimiter>) () -> RedisRateLimiter.create(redisClient))
        );
    }

    private static BucketConfiguration config(int capacity, Duration refill) {
        return BucketConfiguration.builder()
            .addLimit(Bandwidth.classic(capacity, Refill.intervally(capacity, refill)))
            .build();
    }

    private static String key() {
        return "test:" + UUID.randomUUID();
    }

    @ParameterizedTest(name = "[{0}] basic consumption: N requests consume N tokens")
    @MethodSource("bothImpls")
    void basicConsumption(String name, Supplier<RateLimiter> supplier) {
        RateLimiter rl = supplier.get();
        String k = key();
        BucketConfiguration cfg = config(5, Duration.ofMinutes(1));
        for (int i = 0; i < 3; i++) {
            assertThat(rl.tryConsume(k, cfg).allowed()).isTrue();
        }
        assertThat(rl.tryConsume(k, cfg).remaining()).isEqualTo(1L);
    }

    @ParameterizedTest(name = "[{0}] rejection after capacity exhausted")
    @MethodSource("bothImpls")
    void rejectionAfterCapacity(String name, Supplier<RateLimiter> supplier) {
        RateLimiter rl = supplier.get();
        String k = key();
        BucketConfiguration cfg = config(3, Duration.ofMinutes(1));
        for (int i = 0; i < 3; i++) {
            assertThat(rl.tryConsume(k, cfg).allowed()).isTrue();
        }
        RateLimitResult denied = rl.tryConsume(k, cfg);
        assertThat(denied.allowed()).isFalse();
        assertThat(denied.retryAfter()).isPositive();
    }

    @ParameterizedTest(name = "[{0}] refill restores capacity after window")
    @MethodSource("bothImpls")
    void refill(String name, Supplier<RateLimiter> supplier) throws InterruptedException {
        RateLimiter rl = supplier.get();
        String k = key();
        BucketConfiguration cfg = config(2, Duration.ofSeconds(1));
        for (int i = 0; i < 2; i++) {
            rl.tryConsume(k, cfg);
        }
        assertThat(rl.tryConsume(k, cfg).allowed()).isFalse();
        Thread.sleep(1100);
        assertThat(rl.tryConsume(k, cfg).allowed()).isTrue();
    }

    @ParameterizedTest(name = "[{0}] per-key isolation")
    @MethodSource("bothImpls")
    void perKeyIsolation(String name, Supplier<RateLimiter> supplier) {
        RateLimiter rl = supplier.get();
        BucketConfiguration cfg = config(2, Duration.ofMinutes(1));
        String a = key();
        String b = key();
        rl.tryConsume(a, cfg);
        rl.tryConsume(a, cfg);
        assertThat(rl.tryConsume(a, cfg).allowed()).isFalse();
        assertThat(rl.tryConsume(b, cfg).allowed()).isTrue();
    }

    @ParameterizedTest(name = "[{0}] concurrent on same key: total admissions == capacity")
    @MethodSource("bothImpls")
    void concurrentSameKey(String name, Supplier<RateLimiter> supplier) throws Exception {
        RateLimiter rl = supplier.get();
        String k = key();
        BucketConfiguration cfg = config(5, Duration.ofMinutes(1));
        int threads = 10;
        ExecutorService exec = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(1);
        @SuppressWarnings("unchecked")
        Future<Boolean>[] futures = new Future[threads];
        for (int i = 0; i < threads; i++) {
            futures[i] = exec.submit(() -> {
                latch.await();
                return rl.tryConsume(k, cfg).allowed();
            });
        }
        latch.countDown();
        int admitted = 0;
        for (Future<Boolean> f : futures) {
            if (f.get()) {
                admitted++;
            }
        }
        assertThat(admitted).isEqualTo(5);
        exec.shutdown();
    }

    @ParameterizedTest(name = "[{0}] remaining is monotonically non-increasing within window")
    @MethodSource("bothImpls")
    void remainingMonotonic(String name, Supplier<RateLimiter> supplier) {
        RateLimiter rl = supplier.get();
        String k = key();
        BucketConfiguration cfg = config(5, Duration.ofMinutes(1));
        long prev = Long.MAX_VALUE;
        for (int i = 0; i < 4; i++) {
            long rem = rl.tryConsume(k, cfg).remaining();
            assertThat(rem).isLessThanOrEqualTo(prev);
            prev = rem;
        }
    }

    @ParameterizedTest(name = "[{0}] retryAfter when rejected is positive")
    @MethodSource("bothImpls")
    void retryAfterSemantics(String name, Supplier<RateLimiter> supplier) {
        RateLimiter rl = supplier.get();
        String k = key();
        BucketConfiguration cfg = config(1, Duration.ofMinutes(1));
        assertThat(rl.tryConsume(k, cfg).allowed()).isTrue();
        RateLimitResult denied = rl.tryConsume(k, cfg);
        assertThat(denied.allowed()).isFalse();
        assertThat(denied.retryAfter()).isGreaterThanOrEqualTo(Duration.ofMillis(500));
    }

    @ParameterizedTest(name = "[{0}] same BucketConfiguration -> same observable behavior")
    @MethodSource("bothImpls")
    void configurationParity(String name, Supplier<RateLimiter> supplier) {
        RateLimiter rl = supplier.get();
        BucketConfiguration cfg = config(3, Duration.ofMinutes(1));
        String k = key();
        for (int i = 0; i < 3; i++) {
            assertThat(rl.tryConsume(k, cfg).allowed()).isTrue();
        }
        assertThat(rl.tryConsume(k, cfg).allowed()).isFalse();
    }

    @Test
    void redisCrossInstanceStateSharing() {
        RateLimiter a = RedisRateLimiter.create(redisClient);
        RateLimiter b = RedisRateLimiter.create(redisClient);
        String k = key();
        BucketConfiguration cfg = config(3, Duration.ofMinutes(1));
        a.tryConsume(k, cfg);
        a.tryConsume(k, cfg);
        b.tryConsume(k, cfg);
        // 3 total admissions across instances; 4th from either should fail.
        assertThat(b.tryConsume(k, cfg).allowed()).isFalse();
    }
}
