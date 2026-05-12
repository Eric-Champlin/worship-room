package com.worshiproom.cache;

import org.springframework.boot.actuate.health.AbstractHealthIndicator;
import org.springframework.boot.actuate.health.Health;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.stereotype.Component;

/**
 * Actuator health indicator for Redis (Spec 5.6 / W10 / Gate 27 / D4).
 *
 * <p>Bean name {@code redisHealthIndicator} → exposed at {@code GET /actuator/health/redis}
 * by Spring Boot Actuator's bean-name → URL-path convention. Reports UP when Redis responds
 * to PING; on any failure emits the custom {@code DEGRADED} status from
 * {@link DegradedAwareStatusAggregator#DEGRADED} so that the aggregator priority list
 * yields overall {@code DEGRADED}, not {@code DOWN}.
 *
 * <p>Spring Boot's auto-configured Redis indicator is disabled via
 * {@code management.health.redis.enabled=false} in {@code application.properties} so this
 * custom indicator is the sole reporter for the {@code redis} component name.
 */
@Component
public class RedisHealthIndicator extends AbstractHealthIndicator {

    private final RedisConnectionFactory factory;

    public RedisHealthIndicator(RedisConnectionFactory factory) {
        this.factory = factory;
    }

    @Override
    protected void doHealthCheck(Health.Builder builder) {
        try (RedisConnection conn = factory.getConnection()) {
            String pong = conn.ping();
            if ("PONG".equalsIgnoreCase(pong)) {
                builder.up()
                    .withDetail("version", "redis-7-alpine")
                    .withDetail("ping", pong);
            } else {
                builder.status(DegradedAwareStatusAggregator.DEGRADED)
                    .withDetail("ping", String.valueOf(pong));
            }
        } catch (Exception ex) {
            builder.status(DegradedAwareStatusAggregator.DEGRADED).withException(ex);
        }
    }
}
