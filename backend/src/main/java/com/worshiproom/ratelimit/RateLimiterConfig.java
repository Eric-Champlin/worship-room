package com.worshiproom.ratelimit;

import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.codec.ByteArrayCodec;
import io.sentry.Sentry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Profile- and property-aware {@link RateLimiter} bean selection (Spec 5.6 / D3 / D4).
 *
 * <p>Selection key: {@code worshiproom.ratelimit.backend} property.
 * <ul>
 *   <li>{@code memory} (dev / test default) → {@link InMemoryRateLimiter}</li>
 *   <li>{@code redis} (prod default) → {@link RedisRateLimiter}, with startup probe.
 *       If Redis is unreachable at boot, falls back to {@link InMemoryRateLimiter}
 *       and logs WARN. Health indicator independently reports DEGRADED (W10).</li>
 * </ul>
 *
 * <p>Per D1 / W3 / Gate 28: 5.6 does NOT migrate any of the 11 existing per-service rate
 * limiters. The first new consumer is expected to be Phase 6.1.
 */
@Configuration
public class RateLimiterConfig {

    private static final Logger log = LoggerFactory.getLogger(RateLimiterConfig.class);
    private static final int DEFAULT_BUCKET_CACHE_SIZE = 10_000;

    @Bean
    @ConditionalOnProperty(name = "worshiproom.ratelimit.backend", havingValue = "memory",
        matchIfMissing = true)
    public RateLimiter inMemoryRateLimiter() {
        return new InMemoryRateLimiter(DEFAULT_BUCKET_CACHE_SIZE);
    }

    @Bean
    @ConditionalOnProperty(name = "worshiproom.ratelimit.backend", havingValue = "redis")
    public RateLimiter redisRateLimiter(
            @Value("${spring.data.redis.url:}") String url,
            @Value("${spring.data.redis.host:localhost}") String host,
            @Value("${spring.data.redis.port:6379}") int port,
            @Value("${spring.data.redis.password:}") String password) {

        RedisURI uri;
        if (url != null && !url.isBlank()) {
            uri = RedisURI.create(url);
        } else {
            RedisURI.Builder b = RedisURI.builder().withHost(host).withPort(port);
            if (password != null && !password.isBlank()) {
                b.withPassword(password.toCharArray());
            }
            uri = b.build();
        }

        RedisClient client = RedisClient.create(uri);
        try (StatefulRedisConnection<byte[], byte[]> probe = client.connect(ByteArrayCodec.INSTANCE)) {
            probe.sync().ping();
        } catch (Exception ex) {
            // Spec 5.6 D4 / W10: Redis is OPTIONAL in prod — degrade rather than hard-fail at boot.
            // Master plan AC: "Redis connection failures are logged at ERROR and propagate to Sentry."
            log.error("Redis unreachable at startup; falling back to InMemoryRateLimiter (degraded mode).", ex);
            Sentry.captureException(ex);
            client.shutdown();
            return new InMemoryRateLimiter(DEFAULT_BUCKET_CACHE_SIZE);
        }
        return RedisRateLimiter.create(client);
    }
}
