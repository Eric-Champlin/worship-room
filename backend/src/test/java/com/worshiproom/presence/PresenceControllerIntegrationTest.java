package com.worshiproom.presence;

import com.worshiproom.auth.JwtService;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.support.TestContainers;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Spec 6.11b — verifies the {@code GET /api/v1/prayer-wall/presence} endpoint:
 * standard envelope shape, anonymous + authenticated success, and 429 behavior
 * when the auth bucket is exhausted (uses a tiny per-test bucket via
 * {@code @DynamicPropertySource}).
 */
@AutoConfigureMockMvc
class PresenceControllerIntegrationTest extends AbstractIntegrationTest {

    private static final String TEST_JWT_SECRET =
            "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx";

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> TEST_JWT_SECRET);
        registry.add("auth.rate-limit.per-email.capacity", () -> "1000");
        registry.add("auth.rate-limit.per-ip.capacity", () -> "10000");
        // Tiny presence buckets so we can exhaust them in tests
        registry.add("worshiproom.presence.auth-rate-limit.requests-per-minute", () -> "3");
        registry.add("worshiproom.presence.anon-rate-limit.requests-per-minute", () -> "3");
        TestContainers.registerRedisProperties(registry);
    }

    @Autowired private MockMvc mvc;
    @Autowired private RedisTemplate<String, String> redisTemplate;
    @Autowired private PresenceProperties props;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;
    @Autowired private CacheManager cacheManager;
    @Autowired private PresenceAuthRateLimitService authRateLimit;
    @Autowired private PresenceAnonRateLimitService anonRateLimit;

    @BeforeEach
    void setup() {
        redisTemplate.delete(props.getSortedSetKey());
        userRepository.deleteAll();
        Cache c = cacheManager.getCache("prayer-wall-presence");
        if (c != null) c.clear();
        authRateLimit.resetForTesting();
        anonRateLimit.resetForTesting();
    }

    @AfterEach
    void teardown() {
        redisTemplate.delete(props.getSortedSetKey());
        userRepository.deleteAll();
    }

    @Test
    void anonymousGetReturnsZeroCountAndStandardEnvelope() throws Exception {
        mvc.perform(get("/api/v1/prayer-wall/presence"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.count").value(0))
            .andExpect(jsonPath("$.meta.requestId").exists());
    }

    @Test
    void authenticatedGetReturnsCount() throws Exception {
        User alice = userRepository.save(new User("alice-pres-ctrl@test.local", "$2a$10$x",
                "Alice", "A", "UTC"));
        String jwt = jwtService.generateToken(alice.getId(), false);

        // Seed a member directly so the count reflects something
        redisTemplate.opsForZSet().add(props.getSortedSetKey(),
                "anon:" + java.util.UUID.randomUUID(), java.time.Instant.now().getEpochSecond());

        mvc.perform(get("/api/v1/prayer-wall/presence")
                .header("Authorization", "Bearer " + jwt))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.count").value(1));
    }

    @Test
    void authenticatedRateLimitReturns429WithRetryAfter() throws Exception {
        User alice = userRepository.save(new User("alice-pres-rl@test.local", "$2a$10$x",
                "Alice", "A", "UTC"));
        String jwt = jwtService.generateToken(alice.getId(), false);

        // Bucket is 3/min. Three calls should succeed; 4th returns 429.
        for (int i = 0; i < 3; i++) {
            mvc.perform(get("/api/v1/prayer-wall/presence")
                    .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk());
        }

        mvc.perform(get("/api/v1/prayer-wall/presence")
                .header("Authorization", "Bearer " + jwt))
            .andExpect(status().isTooManyRequests())
            .andExpect(header().exists("Retry-After"))
            .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
    }

    @Test
    void anonymousRateLimitReturns429() throws Exception {
        // Anonymous bucket is 3/min per IP. MockMvc requests come from same IP (127.0.0.1).
        for (int i = 0; i < 3; i++) {
            mvc.perform(get("/api/v1/prayer-wall/presence"))
                .andExpect(status().isOk());
        }

        mvc.perform(get("/api/v1/prayer-wall/presence"))
            .andExpect(status().isTooManyRequests())
            .andExpect(header().exists("Retry-After"))
            .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
    }
}
