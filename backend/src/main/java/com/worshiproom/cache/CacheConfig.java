package com.worshiproom.cache;

import java.time.Duration;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;

/**
 * CacheManager wiring (Spec 5.6).
 *
 * <p>Profile-aware bean selection:
 * <ul>
 *   <li>dev / test → {@link ConcurrentMapCacheManager} (no Redis needed for local iteration)</li>
 *   <li>prod → {@link RedisCacheManager} wrapped in {@link CircuitBreakingCacheManager}
 *       (3 consecutive failures → bypass for 30s; D8 / W9)</li>
 * </ul>
 *
 * <p>5.6 adds ZERO {@code @Cacheable} annotations (D5 / W4 / MPD-3). The CacheManager is
 * wired so future specs (Phase 6.1 Prayer Receipt is the first natural consumer) can add
 * {@code @Cacheable} one method at a time.
 *
 * <p>Per-cache TTLs are read from {@code spring.cache.redis.time-to-live.<cacheName>} when
 * declared in {@code application.properties}. No cache names are declared in 5.6;
 * {@code RepoWideTtlEnforcementTest} verifies that every {@code @Cacheable} present has a
 * corresponding TTL property (vacuous today).
 *
 * <p>{@link EnableCaching} activates Spring's caching AOP proxy. Added in Spec 6.1 (the
 * first @{@code Cacheable} consumer) — without it the annotation is silently ignored.
 */
@Configuration
@EnableCaching
public class CacheConfig {

    private static final Duration DEFAULT_TTL = Duration.ofMinutes(5);
    private static final String CACHE_KEY_PREFIX = "cache:";

    @Bean
    @Profile({"dev", "test"})
    public CacheManager inMemoryCacheManager() {
        return new ConcurrentMapCacheManager();
    }

    @Bean
    @Profile("prod")
    public CacheManager redisCacheManager(RedisConnectionFactory factory) {
        RedisCacheConfiguration baseConfig = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(DEFAULT_TTL)
            .computePrefixWith(cacheName -> CACHE_KEY_PREFIX + cacheName + ":")
            .disableCachingNullValues();
        RedisCacheManager redisCacheManager = RedisCacheManager.builder(factory)
            .cacheDefaults(baseConfig)
            .build();
        return new CircuitBreakingCacheManager(redisCacheManager);
    }
}
