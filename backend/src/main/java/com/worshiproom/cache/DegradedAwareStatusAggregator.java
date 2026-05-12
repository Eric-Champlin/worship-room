package com.worshiproom.cache;

import org.springframework.boot.actuate.health.SimpleStatusAggregator;
import org.springframework.boot.actuate.health.Status;
import org.springframework.boot.actuate.health.StatusAggregator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Custom Status aggregator (Spec 5.6 / W10 / Gate 27 / D4).
 *
 * <p>Default Spring Boot aggregator: any DOWN → overall DOWN.
 * Worship Room override: introduces a {@link #DEGRADED} status emitted by
 * {@link RedisHealthIndicator} when Redis is unreachable. The priority list
 * {@code DOWN > DEGRADED > OUT_OF_SERVICE > UP > UNKNOWN} yields the desired behavior:
 * <ul>
 *   <li>Redis unreachable, everything else UP → overall DEGRADED (200).</li>
 *   <li>db or diskSpace DOWN → overall DOWN (503), regardless of Redis state.</li>
 * </ul>
 *
 * <p>Rationale: Redis is OPTIONAL in prod (D4). Backend continues serving requests
 * with in-memory rate limiter + cache bypass. "DOWN" misrepresents this state to
 * load balancers and uptime monitors; "DEGRADED" is more accurate.
 */
@Configuration
public class DegradedAwareStatusAggregator {

    public static final Status DEGRADED = new Status("DEGRADED",
        "Service running with reduced functionality (e.g., cache or rate-limit backend unavailable)");

    @Bean
    public StatusAggregator statusAggregator() {
        return new SimpleStatusAggregator(
            Status.DOWN, DEGRADED, Status.OUT_OF_SERVICE, Status.UP, Status.UNKNOWN);
    }
}
