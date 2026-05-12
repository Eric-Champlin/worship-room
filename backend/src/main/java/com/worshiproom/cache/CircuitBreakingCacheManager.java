package com.worshiproom.cache;

import io.sentry.Sentry;
import java.time.Duration;
import java.util.Collection;
import java.util.concurrent.Callable;
import java.util.concurrent.atomic.AtomicInteger;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.dao.DataAccessException;

/**
 * Circuit-breaker wrapper around a delegate {@link CacheManager} (Spec 5.6 / D8 / W9).
 *
 * <p>State machine (per-process, not cross-instance):
 * <ul>
 *   <li>3 consecutive failures from the delegate → open the circuit.</li>
 *   <li>While open: cache reads return {@code null}, writes are no-ops. No delegate calls.</li>
 *   <li>After {@code recoveryWindow} (30s default) since circuit opened: next call attempts
 *       the delegate. Success → close circuit; failure → reset recovery window.</li>
 * </ul>
 *
 * <p>Failure counter and circuit-open timestamp are in-memory (intentionally per-instance);
 * multi-instance deploys can have different circuits open at any moment. This is a
 * per-process resilience mechanism, not a coordination primitive.
 */
public class CircuitBreakingCacheManager implements CacheManager {

    private static final Logger log = LoggerFactory.getLogger(CircuitBreakingCacheManager.class);
    private static final int FAILURE_THRESHOLD = 3;
    private static final Duration DEFAULT_RECOVERY_WINDOW = Duration.ofSeconds(30);

    private final CacheManager delegate;
    private final AtomicInteger consecutiveFailures = new AtomicInteger(0);
    private volatile long circuitOpenedAt = 0L;
    private volatile Duration recoveryWindow = DEFAULT_RECOVERY_WINDOW;

    public CircuitBreakingCacheManager(CacheManager delegate) {
        this.delegate = delegate;
    }

    @Override
    public Cache getCache(String name) {
        Cache underlying = delegate.getCache(name);
        if (underlying == null) {
            return null;
        }
        return new CircuitBreakingCache(underlying);
    }

    @Override
    public Collection<String> getCacheNames() {
        return delegate.getCacheNames();
    }

    /** Visible for tests. */
    public boolean isCircuitOpen() {
        if (circuitOpenedAt == 0L) {
            return false;
        }
        long elapsedMs = System.currentTimeMillis() - circuitOpenedAt;
        return elapsedMs < recoveryWindow.toMillis();
    }

    /** Package-private for tests; avoids 30-second real-time waits in CI. */
    void setRecoveryWindowForTesting(Duration window) {
        this.recoveryWindow = window;
    }

    private boolean shouldBypass() {
        return isCircuitOpen();
    }

    private void recordSuccess() {
        if (consecutiveFailures.get() > 0 || circuitOpenedAt != 0L) {
            if (circuitOpenedAt != 0L) {
                log.info("Cache circuit closed; Redis reachable again.");
            }
            consecutiveFailures.set(0);
            circuitOpenedAt = 0L;
        }
    }

    private void recordFailure(Throwable cause) {
        int failures = consecutiveFailures.incrementAndGet();
        if (circuitOpenedAt != 0L && !isCircuitOpen()) {
            // Half-open probe: the recovery window had elapsed and our attempted delegate call
            // failed. Reset the timer so we bypass for another window instead of staying stuck
            // half-open (which would let every subsequent call hit the dead delegate). No
            // re-capture to Sentry — the initial open already paged the operator.
            circuitOpenedAt = System.currentTimeMillis();
            log.warn("Cache circuit re-opened after half-open probe failed; bypassing for another {}s.",
                recoveryWindow.toSeconds());
            return;
        }
        if (failures >= FAILURE_THRESHOLD && circuitOpenedAt == 0L) {
            circuitOpenedAt = System.currentTimeMillis();
            log.error("Cache circuit opened after {} consecutive Redis failures; bypassing for {}s. cause={}",
                failures, recoveryWindow.toSeconds(), cause.toString());
            // Spec 5.6 master plan AC: "Redis connection failures are logged at ERROR and
            // propagate to Sentry." Capture fires once per open transition (not once per failure)
            // to avoid log/event spam from continuous probing.
            Sentry.captureException(cause);
        }
    }

    private boolean isRedisFailure(Throwable t) {
        // DataAccessException is the umbrella for the Spring Data Redis exception hierarchy
        // (RedisConnectionFailureException, RedisSystemException, QueryTimeoutException, etc.).
        // Since this wrapper sits only around RedisCacheManager, any DAO exception here is
        // attributable to Redis.
        return t instanceof DataAccessException;
    }

    private class CircuitBreakingCache implements Cache {

        private final Cache underlying;

        CircuitBreakingCache(Cache underlying) {
            this.underlying = underlying;
        }

        @Override
        public String getName() {
            return underlying.getName();
        }

        @Override
        public Object getNativeCache() {
            return underlying.getNativeCache();
        }

        @Override
        public ValueWrapper get(Object key) {
            if (shouldBypass()) {
                return null;
            }
            try {
                ValueWrapper result = underlying.get(key);
                recordSuccess();
                return result;
            } catch (RuntimeException ex) {
                if (isRedisFailure(ex)) {
                    recordFailure(ex);
                    return null;
                }
                throw ex;
            }
        }

        @Override
        public <T> T get(Object key, Class<T> type) {
            if (shouldBypass()) {
                return null;
            }
            try {
                T result = underlying.get(key, type);
                recordSuccess();
                return result;
            } catch (RuntimeException ex) {
                if (isRedisFailure(ex)) {
                    recordFailure(ex);
                    return null;
                }
                throw ex;
            }
        }

        @Override
        public <T> T get(Object key, Callable<T> valueLoader) {
            if (shouldBypass()) {
                try {
                    return valueLoader.call();
                } catch (Exception ex) {
                    throw new ValueRetrievalException(key, valueLoader, ex);
                }
            }
            try {
                T result = underlying.get(key, valueLoader);
                recordSuccess();
                return result;
            } catch (RuntimeException ex) {
                if (isRedisFailure(ex)) {
                    recordFailure(ex);
                    try {
                        return valueLoader.call();
                    } catch (Exception inner) {
                        throw new ValueRetrievalException(key, valueLoader, inner);
                    }
                }
                throw ex;
            }
        }

        @Override
        public void put(Object key, Object value) {
            if (shouldBypass()) {
                return;
            }
            try {
                underlying.put(key, value);
                recordSuccess();
            } catch (RuntimeException ex) {
                if (isRedisFailure(ex)) {
                    recordFailure(ex);
                    return;
                }
                throw ex;
            }
        }

        @Override
        public void evict(Object key) {
            if (shouldBypass()) {
                return;
            }
            try {
                underlying.evict(key);
                recordSuccess();
            } catch (RuntimeException ex) {
                if (isRedisFailure(ex)) {
                    recordFailure(ex);
                    return;
                }
                throw ex;
            }
        }

        @Override
        public void clear() {
            if (shouldBypass()) {
                return;
            }
            try {
                underlying.clear();
                recordSuccess();
            } catch (RuntimeException ex) {
                if (isRedisFailure(ex)) {
                    recordFailure(ex);
                    return;
                }
                throw ex;
            }
        }
    }
}
