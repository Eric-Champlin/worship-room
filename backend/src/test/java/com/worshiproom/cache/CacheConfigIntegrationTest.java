package com.worshiproom.cache;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;

import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.support.TestContainers;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * Verifies CacheManager bean selection per profile, plus circuit-breaker engagement,
 * recovery, and bypass-on-open semantics (Spec 5.6 Step 7).
 *
 * <p>Profile selection of the prod-only {@link RedisCacheManager} bean is exercised by
 * calling {@link CacheConfig#redisCacheManager} directly rather than activating the prod
 * Spring profile (which would require JWT_SECRET, STORAGE_*, and several other prod-only
 * env-vars that are out of scope for this spec's tests).
 */
@SpringBootTest
class CacheConfigIntegrationTest extends AbstractIntegrationTest {

    @DynamicPropertySource
    static void registerRedisProps(DynamicPropertyRegistry registry) {
        TestContainers.registerRedisProperties(registry);
    }

    @Autowired private CacheManager cacheManager;
    @Autowired private RedisConnectionFactory redisConnectionFactory;

    @Test
    void devProfileUsesConcurrentMapCacheManager() {
        assertThat(cacheManager).isInstanceOf(ConcurrentMapCacheManager.class);
    }

    @Test
    void prodCacheConfigMethodReturnsCircuitBreakingCacheManager() {
        CacheConfig config = new CacheConfig();
        CacheManager cm = config.redisCacheManager(redisConnectionFactory);
        assertThat(cm).isInstanceOf(CircuitBreakingCacheManager.class);
    }

    @Test
    void redisCacheManagerPutGetRoundTrip() {
        CacheConfig config = new CacheConfig();
        CacheManager cm = config.redisCacheManager(redisConnectionFactory);
        Cache cache = cm.getCache("test-cache-roundtrip");
        cache.put("key1", "value1");
        Cache.ValueWrapper wrapper = cache.get("key1");
        assertThat(wrapper).isNotNull();
        assertThat(wrapper.get()).isEqualTo("value1");
    }

    @Nested
    class CircuitBreakerBehavior {

        @Test
        void circuitBreakerEngagesAfter3ConsecutiveFailures() {
            CircuitBreakingCacheManager cb = buildWithDeadDelegate();
            try {
                Cache cache = cb.getCache("test-cache");
                assertThat(cache).isNotNull();
                for (int i = 0; i < 3; i++) {
                    cache.get("k", String.class);
                }
                assertThat(cb.isCircuitOpen()).isTrue();
            } finally {
                shutdown(cb);
            }
        }

        @Test
        void circuitBreakerRecoversAfterRecoveryWindow() throws InterruptedException {
            TogglingDelegate togglable = new TogglingDelegate();
            CircuitBreakingCacheManager cb = new CircuitBreakingCacheManager(togglable);
            cb.setRecoveryWindowForTesting(Duration.ofMillis(150));

            togglable.healthy.set(false);
            Cache cache = cb.getCache("test-cache");
            for (int i = 0; i < 3; i++) {
                cache.get("k", String.class);
            }
            assertThat(cb.isCircuitOpen()).isTrue();

            togglable.healthy.set(true);
            Thread.sleep(200);
            cache.put("k", "v");
            // After successful op, circuit should close.
            assertThat(cb.isCircuitOpen()).isFalse();
        }

        @Test
        void circuitBreakerHalfOpenFailureResetsTimer() throws InterruptedException {
            // Spec 5.6 D8: "After 30 seconds, the next call attempts Redis; success closes
            // circuit; failure resets the 30-second timer." Guards against the prior
            // "stuck half-open" bug where the timer was never refreshed and every subsequent
            // call hit the dead delegate.
            TogglingDelegate togglable = new TogglingDelegate();
            CircuitBreakingCacheManager cb = new CircuitBreakingCacheManager(togglable);
            cb.setRecoveryWindowForTesting(Duration.ofMillis(150));

            togglable.healthy.set(false);
            Cache cache = cb.getCache("test-cache");
            for (int i = 0; i < 3; i++) {
                cache.get("k", String.class);
            }
            assertThat(cb.isCircuitOpen()).isTrue();

            // Wait past the recovery window. Delegate is still unhealthy.
            Thread.sleep(200);
            assertThat(cb.isCircuitOpen()).isFalse();

            // Half-open probe attempts the delegate and fails — timer should reset and the
            // circuit should be open again, bypassing for another window.
            cache.get("k", String.class);
            assertThat(cb.isCircuitOpen()).isTrue();
        }

        @Test
        void cacheBypassDuringCircuitOpenDoesNotThrow() {
            CircuitBreakingCacheManager cb = buildWithDeadDelegate();
            try {
                Cache cache = cb.getCache("test-cache");
                // Trigger circuit open.
                for (int i = 0; i < 3; i++) {
                    cache.get("k", String.class);
                }
                // Subsequent operations must not throw, regardless of dead delegate.
                assertThatNoException().isThrownBy(() -> {
                    cache.get("k");
                    cache.put("k", "v");
                    cache.evict("k");
                });
            } finally {
                shutdown(cb);
            }
        }

        @Test
        void getWithValueLoaderInvokesLoaderOnBypass() {
            CircuitBreakingCacheManager cb = buildWithDeadDelegate();
            try {
                Cache cache = cb.getCache("test-cache");
                // Open the circuit.
                for (int i = 0; i < 3; i++) {
                    cache.get("k", String.class);
                }
                // While bypassed, get(key, valueLoader) must still return the loader's value.
                String result = cache.get("k", () -> "loaded");
                assertThat(result).isEqualTo("loaded");
            } finally {
                shutdown(cb);
            }
        }

        private CircuitBreakingCacheManager buildWithDeadDelegate() {
            LettuceConnectionFactory dead = new LettuceConnectionFactory(
                new RedisStandaloneConfiguration("127.0.0.1", 1));
            dead.afterPropertiesSet();
            RedisCacheManager delegate = RedisCacheManager.builder(dead).build();
            CircuitBreakingCacheManager cb = new CircuitBreakingCacheManager(delegate);
            cb.setRecoveryWindowForTesting(Duration.ofSeconds(30));
            // Stash the factory on the manager so shutdown() can find it.
            CACHE_FACTORIES.put(cb, dead);
            return cb;
        }

        private void shutdown(CircuitBreakingCacheManager cb) {
            LettuceConnectionFactory f = CACHE_FACTORIES.remove(cb);
            if (f != null) {
                f.destroy();
            }
        }
    }

    private static final java.util.Map<CircuitBreakingCacheManager, LettuceConnectionFactory>
        CACHE_FACTORIES = new java.util.concurrent.ConcurrentHashMap<>();

    /**
     * Test helper that wraps a {@link ConcurrentMapCacheManager} and conditionally throws
     * {@link RedisConnectionFailureException} when {@code healthy} is {@code false}.
     * Lets the circuit-breaker recovery test fail then heal without container manipulation.
     */
    private static class TogglingDelegate implements CacheManager {
        final AtomicBoolean healthy = new AtomicBoolean(true);
        private final ConcurrentMapCacheManager backing = new ConcurrentMapCacheManager();

        @Override
        public Cache getCache(String name) {
            Cache underlying = backing.getCache(name);
            if (underlying == null) return null;
            return new TogglingCache(underlying, healthy);
        }

        @Override
        public java.util.Collection<String> getCacheNames() {
            return backing.getCacheNames();
        }
    }

    private static class TogglingCache implements Cache {
        private final Cache underlying;
        private final AtomicBoolean healthy;

        TogglingCache(Cache underlying, AtomicBoolean healthy) {
            this.underlying = underlying;
            this.healthy = healthy;
        }

        private void checkHealth() {
            if (!healthy.get()) {
                throw new RedisConnectionFailureException("simulated failure");
            }
        }

        @Override public String getName() { return underlying.getName(); }
        @Override public Object getNativeCache() { return underlying.getNativeCache(); }
        @Override public ValueWrapper get(Object key) { checkHealth(); return underlying.get(key); }
        @Override public <T> T get(Object key, Class<T> type) { checkHealth(); return underlying.get(key, type); }
        @Override public <T> T get(Object key, java.util.concurrent.Callable<T> loader) {
            checkHealth();
            return underlying.get(key, loader);
        }
        @Override public void put(Object key, Object value) { checkHealth(); underlying.put(key, value); }
        @Override public void evict(Object key) { checkHealth(); underlying.evict(key); }
        @Override public void clear() { checkHealth(); underlying.clear(); }
    }
}
