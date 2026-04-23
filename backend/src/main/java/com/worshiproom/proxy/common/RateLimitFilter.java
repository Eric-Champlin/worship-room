package com.worshiproom.proxy.common;

import com.worshiproom.config.ProxyConfig;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);
    private static final String PROXY_PATH_PREFIX = "/api/v1/proxy/";

    private final ProxyConfig config;
    private final IpResolver ipResolver;
    private final HandlerExceptionResolver handlerExceptionResolver;

    /**
     * Per-IP token buckets. Bounded by Caffeine to prevent memory exhaustion
     * when many unique IPs hit the app (a real risk if an attacker cycles
     * values or if the app ever scales to a large number of distinct clients).
     *
     * maximumSize(10_000): rough memory ceiling of ~1 MB worst case (10k IPs
     * × ~100 bytes per bucket). When the cache is full, Caffeine evicts using
     * a Window-TinyLFU policy — functionally LRU for our access pattern.
     *
     * expireAfterAccess(15m): reclaim idle IPs so buckets don't linger after
     * a caller has stopped hitting the API. 15 minutes is longer than any
     * realistic user session's proxy bursts but short enough to keep the cache
     * actively cycling.
     *
     * Caffeine's `get(key, mappingFn)` is the moral equivalent of
     * ConcurrentHashMap.computeIfAbsent — thread-safe, single-call-per-key.
     */
    private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
        .maximumSize(10_000)
        .expireAfterAccess(Duration.ofMinutes(15))
        .build();

    public RateLimitFilter(
            ProxyConfig config,
            IpResolver ipResolver,
            @Qualifier("handlerExceptionResolver") HandlerExceptionResolver handlerExceptionResolver
    ) {
        this.config = config;
        this.ipResolver = ipResolver;
        this.handlerExceptionResolver = handlerExceptionResolver;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith(PROXY_PATH_PREFIX);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String ip = ipResolver.resolve(request);
        Bucket bucket = buckets.get(ip, this::createBucket);
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        if (!probe.isConsumed()) {
            long retryAfterSeconds = Math.max(1L, probe.getNanosToWaitForRefill() / 1_000_000_000L);
            log.info("Rate limit hit for ip={} retryAfter={}s", ip, retryAfterSeconds);
            RateLimitExceededException ex = new RateLimitExceededException(retryAfterSeconds);
            handlerExceptionResolver.resolveException(request, response, null, ex);
            return;
        }

        long remaining = probe.getRemainingTokens();
        long resetEpochSeconds = Instant.now()
            .plusNanos(probe.getNanosToWaitForRefill())
            .getEpochSecond();

        response.setHeader("X-RateLimit-Limit", String.valueOf(config.getRateLimit().getBurstCapacity()));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));
        response.setHeader("X-RateLimit-Reset", String.valueOf(resetEpochSeconds));

        filterChain.doFilter(request, response);
    }

    private Bucket createBucket(String ip) {
        var rl = config.getRateLimit();
        Bandwidth limit = Bandwidth.classic(
            rl.getBurstCapacity(),
            Refill.intervally(rl.getRequestsPerMinute(), Duration.ofMinutes(1))
        );
        return Bucket.builder().addLimit(limit).build();
    }
}
