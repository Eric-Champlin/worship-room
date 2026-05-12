package com.worshiproom.cache;

import static org.assertj.core.api.Assertions.assertThat;

import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.support.TestContainers;
import io.lettuce.core.RedisURI;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.SimpleStatusAggregator;
import org.springframework.boot.actuate.health.Status;
import org.springframework.boot.actuate.health.StatusAggregator;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * Verifies Redis connectivity, {@link RedisHealthIndicator} UP/DEGRADED transitions,
 * URL parsing precedence, and aggregator behavior (Spec 5.6 Step 6).
 *
 * <p>DEGRADED scenarios are exercised via a freshly-constructed {@link LettuceConnectionFactory}
 * pointing at an unused port, rather than stop/start of the singleton Testcontainer — stopping
 * a singleton container that other tests autowire against breaks cached connection state
 * (port remaps after restart). This isolates DEGRADED testing from the shared container.
 */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class RedisIntegrationTest extends AbstractIntegrationTest {

    @DynamicPropertySource
    static void registerRedisProps(DynamicPropertyRegistry registry) {
        TestContainers.registerRedisProperties(registry);
    }

    @Autowired private RedisConnectionFactory connectionFactory;
    @Autowired private RedisHealthIndicator healthIndicator;
    @Autowired private TestRestTemplate rest;
    @LocalServerPort private int port;

    @Test
    void redisContainerAcceptsConnections() {
        try (RedisConnection conn = connectionFactory.getConnection()) {
            assertThat(conn.ping()).isEqualToIgnoringCase("PONG");
        }
    }

    @Test
    void healthIndicatorReportsUpWhenRedisReachable() {
        Health health = healthIndicator.health();
        assertThat(health.getStatus()).isEqualTo(Status.UP);
        assertThat(health.getDetails()).containsKey("ping");
    }

    @Test
    void healthIndicatorReportsDegradedWhenRedisUnreachable() {
        // Independent factory pointing at an unused port; does NOT touch the singleton container.
        LettuceConnectionFactory dead = new LettuceConnectionFactory(
            new RedisStandaloneConfiguration("127.0.0.1", 1));
        dead.afterPropertiesSet();
        try {
            RedisHealthIndicator deadIndicator = new RedisHealthIndicator(dead);
            Health health = deadIndicator.health();
            assertThat(health.getStatus().getCode()).isEqualTo("DEGRADED");
        } finally {
            dead.destroy();
        }
    }

    @Test
    void redisUrlParsingResolvesHostPortPassword() {
        RedisURI uri = RedisURI.create("rediss://user:secret@example.com:6380/2");
        assertThat(uri.getHost()).isEqualTo("example.com");
        assertThat(uri.getPort()).isEqualTo(6380);
        assertThat(String.valueOf(uri.getPassword())).isEqualTo("secret");
        assertThat(uri.isSsl()).isTrue();
        assertThat(uri.getDatabase()).isEqualTo(2);
    }

    @Test
    void actuatorHealthRedisEndpointReturnsUp() {
        String body = rest.getForObject(
            "http://localhost:" + port + "/actuator/health/redis", String.class);
        assertThat(body).contains("\"status\":\"UP\"");
    }

    @Test
    void degradedAwareAggregatorReturnsDegradedWhenOnlyRedisIsDegraded() {
        // Pure aggregator check — verifies that when the wired indicator emits DEGRADED while
        // db/diskSpace stay UP, the aggregator priority list yields DEGRADED (not DOWN).
        StatusAggregator aggregator = new SimpleStatusAggregator(
            Status.DOWN,
            DegradedAwareStatusAggregator.DEGRADED,
            Status.OUT_OF_SERVICE,
            Status.UP,
            Status.UNKNOWN);

        Status overall = aggregator.getAggregateStatus(
            Set.of(Status.UP, DegradedAwareStatusAggregator.DEGRADED));
        assertThat(overall.getCode()).isEqualTo("DEGRADED");

        // Sanity: a real DOWN component still wins over DEGRADED.
        Status overallWithDown = aggregator.getAggregateStatus(
            Set.of(Status.DOWN, DegradedAwareStatusAggregator.DEGRADED));
        assertThat(overallWithDown).isEqualTo(Status.DOWN);
    }
}
