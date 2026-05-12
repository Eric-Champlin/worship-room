package com.worshiproom.ratelimit;

import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.distributed.BucketProxy;
import io.github.bucket4j.distributed.ExpirationAfterWriteStrategy;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.github.bucket4j.redis.lettuce.Bucket4jLettuce;
import io.lettuce.core.RedisClient;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.codec.ByteArrayCodec;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * bucket4j-lettuce Redis implementation (Spec 5.6 / D2).
 *
 * <p>Token-bucket algorithm preserved from {@link InMemoryRateLimiter} (W7); only
 * bucket state storage differs (in-memory Caffeine map → Redis CAS via Lettuce).
 *
 * <p>All Redis keys prefixed with {@code rate:} per D11 namespace conventions.
 */
public class RedisRateLimiter implements RateLimiter {

    private static final String RATE_KEY_PREFIX = "rate:";
    private static final Duration BUCKET_TTL = Duration.ofHours(1);

    private final ProxyManager<byte[]> proxyManager;

    public RedisRateLimiter(StatefulRedisConnection<byte[], byte[]> connection) {
        this.proxyManager = Bucket4jLettuce.casBasedBuilder(connection)
            .expirationAfterWrite(ExpirationAfterWriteStrategy.fixedTimeToLive(BUCKET_TTL))
            .build();
    }

    public static RedisRateLimiter create(RedisClient redisClient) {
        return new RedisRateLimiter(redisClient.connect(ByteArrayCodec.INSTANCE));
    }

    @Override
    public RateLimitResult tryConsume(String bucketKey, BucketConfiguration config) {
        byte[] key = (RATE_KEY_PREFIX + bucketKey).getBytes(StandardCharsets.UTF_8);
        BucketProxy bucket = proxyManager.builder().build(key, () -> config);
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            return new RateLimitResult(true, probe.getRemainingTokens(), Duration.ZERO);
        }
        long retryNanos = probe.getNanosToWaitForRefill();
        return new RateLimitResult(false, probe.getRemainingTokens(),
            Duration.ofNanos(Math.max(retryNanos, TimeUnit.SECONDS.toNanos(1))));
    }
}
