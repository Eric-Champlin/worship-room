package com.worshiproom.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.worshiproom.proxy.common.IpResolver;
import com.worshiproom.proxy.common.RateLimitExceededException;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;

/**
 * Rate limits POST /api/v1/auth/login along two dimensions: per-email and per-IP.
 * BOTH must pass. Uses Caffeine-bounded bucket caches (one per dimension) to prevent
 * memory exhaustion from an attacker cycling input. Named Login* to disambiguate from
 * the proxy-layer RateLimitFilter (same pattern, different scope).
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class LoginRateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(LoginRateLimitFilter.class);
    private static final String LOGIN_PATH = "/api/v1/auth/login";

    private final ObjectMapper objectMapper;
    private final IpResolver ipResolver;
    private final HandlerExceptionResolver handlerExceptionResolver;

    private final int perEmailCapacity;
    private final int perEmailWindowMinutes;
    private final int perIpCapacity;
    private final int perIpWindowMinutes;

    private final Cache<String, Bucket> emailBuckets;
    private final Cache<String, Bucket> ipBuckets;

    public LoginRateLimitFilter(
            ObjectMapper objectMapper,
            IpResolver ipResolver,
            @Qualifier("handlerExceptionResolver") HandlerExceptionResolver handlerExceptionResolver,
            @Value("${auth.rate-limit.per-email.capacity}") int perEmailCapacity,
            @Value("${auth.rate-limit.per-email.window-minutes}") int perEmailWindowMinutes,
            @Value("${auth.rate-limit.per-ip.capacity}") int perIpCapacity,
            @Value("${auth.rate-limit.per-ip.window-minutes}") int perIpWindowMinutes
    ) {
        this.objectMapper = objectMapper;
        this.ipResolver = ipResolver;
        this.handlerExceptionResolver = handlerExceptionResolver;
        this.perEmailCapacity = perEmailCapacity;
        this.perEmailWindowMinutes = perEmailWindowMinutes;
        this.perIpCapacity = perIpCapacity;
        this.perIpWindowMinutes = perIpWindowMinutes;

        this.emailBuckets = Caffeine.newBuilder()
            .maximumSize(50_000)
            .expireAfterAccess(Duration.ofMinutes(30))
            .build();
        this.ipBuckets = Caffeine.newBuilder()
            .maximumSize(50_000)
            .expireAfterAccess(Duration.ofMinutes(30))
            .build();
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !("POST".equalsIgnoreCase(request.getMethod())
                 && LOGIN_PATH.equals(request.getRequestURI()));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String ip = ipResolver.resolve(request);
        Bucket ipBucket = ipBuckets.get(ip, k -> buildBucket(perIpCapacity, perIpWindowMinutes));
        ConsumptionProbe ipProbe = ipBucket.tryConsumeAndReturnRemaining(1);
        if (!ipProbe.isConsumed()) {
            long retryAfter = Math.max(1L, ipProbe.getNanosToWaitForRefill() / 1_000_000_000L);
            log.info("loginRateLimitExceeded dimension=ip ip={} retryAfter={}s", ip, retryAfter);
            handlerExceptionResolver.resolveException(request, response, null,
                new RateLimitExceededException(retryAfter));
            return;
        }

        CachedBodyHttpServletRequest wrapped = new CachedBodyHttpServletRequest(request);
        String email = extractEmail(wrapped.getCachedBody());

        if (email != null && !email.isBlank()) {
            String normalized = email.toLowerCase(Locale.ROOT).trim();
            Bucket emailBucket = emailBuckets.get(normalized,
                k -> buildBucket(perEmailCapacity, perEmailWindowMinutes));
            ConsumptionProbe emailProbe = emailBucket.tryConsumeAndReturnRemaining(1);
            if (!emailProbe.isConsumed()) {
                long retryAfter = Math.max(1L, emailProbe.getNanosToWaitForRefill() / 1_000_000_000L);
                // Log a hashed email so per-email brute-force patterns are
                // forensically correlatable without leaking raw addresses
                // (07-logging-monitoring.md PII rule).
                log.info("loginRateLimitExceeded dimension=email emailHash={} retryAfter={}s",
                    EmailHasher.hash(normalized), retryAfter);
                handlerExceptionResolver.resolveException(request, response, null,
                    new RateLimitExceededException(retryAfter));
                return;
            }
            // Report the tighter of the two dimensions so Limit, Remaining, and
            // Reset all describe the same bucket. If we reported the per-email
            // Limit while Remaining reflected the tighter per-IP bucket, the
            // client would see "2 of 5" when the real cap driving Remaining was
            // 20 — a misleading semantic that produces wrong backoff math.
            long emailRemaining = emailProbe.getRemainingTokens();
            long ipRemaining = ipProbe.getRemainingTokens();
            long limit;
            long remaining;
            long nanosToReset;
            if (emailRemaining <= ipRemaining) {
                limit = perEmailCapacity;
                remaining = emailRemaining;
                nanosToReset = emailProbe.getNanosToWaitForRefill();
            } else {
                limit = perIpCapacity;
                remaining = ipRemaining;
                nanosToReset = ipProbe.getNanosToWaitForRefill();
            }
            response.setHeader("X-RateLimit-Limit", String.valueOf(limit));
            response.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));
            response.setHeader("X-RateLimit-Reset",
                String.valueOf(Instant.now().plusNanos(nanosToReset).getEpochSecond()));
        } else {
            response.setHeader("X-RateLimit-Limit", String.valueOf(perIpCapacity));
            response.setHeader("X-RateLimit-Remaining", String.valueOf(ipProbe.getRemainingTokens()));
            response.setHeader("X-RateLimit-Reset", String.valueOf(
                Instant.now().plusNanos(ipProbe.getNanosToWaitForRefill()).getEpochSecond()));
        }

        chain.doFilter(wrapped, response);
    }

    private Bucket buildBucket(int capacity, int windowMinutes) {
        Bandwidth limit = Bandwidth.classic(capacity,
            Refill.intervally(capacity, Duration.ofMinutes(windowMinutes)));
        return Bucket.builder().addLimit(limit).build();
    }

    private String extractEmail(byte[] body) {
        if (body == null || body.length == 0) return null;
        try {
            JsonNode tree = objectMapper.readTree(body);
            JsonNode emailNode = tree.get("email");
            return (emailNode != null && emailNode.isTextual()) ? emailNode.asText() : null;
        } catch (IOException e) {
            return null;
        }
    }
}
