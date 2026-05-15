package com.worshiproom.presence;

import com.worshiproom.auth.JwtService;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.support.TestContainers;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * Spec 6.11b — verifies that {@link PresenceTrackingInterceptor} bumps the
 * sorted set on read paths and issues anonymous cookies as expected.
 *
 * <p>Uses MockMvc (not a live HTTP client) so the JWT filter chain plus Spring
 * MVC handler-interceptor pipeline both run end-to-end. The interceptor is the
 * unit under test, not the controller — assertions focus on Redis state and
 * the {@code Set-Cookie} response header.
 */
@AutoConfigureMockMvc
class PresenceInterceptorIntegrationTest extends AbstractIntegrationTest {

    private static final String TEST_JWT_SECRET =
            "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx";

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> TEST_JWT_SECRET);
        registry.add("auth.rate-limit.per-email.capacity", () -> "1000");
        registry.add("auth.rate-limit.per-ip.capacity", () -> "10000");
        TestContainers.registerRedisProperties(registry);
    }

    @Autowired private MockMvc mvc;
    @Autowired private RedisTemplate<String, String> redisTemplate;
    @Autowired private PresenceProperties props;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;

    @BeforeEach
    void setup() {
        redisTemplate.delete(props.getSortedSetKey());
        userRepository.deleteAll();
    }

    @AfterEach
    void teardown() {
        redisTemplate.delete(props.getSortedSetKey());
        userRepository.deleteAll();
    }

    @Test
    void authenticatedGetPostsBumpsUserMember() throws Exception {
        User alice = userRepository.save(new User("alice-presence@test.local", "$2a$10$x",
                "Alice", "A", "UTC"));
        String jwt = jwtService.generateToken(alice.getId(), false);

        mvc.perform(get("/api/v1/posts").header("Authorization", "Bearer " + jwt));

        Long count = redisTemplate.opsForZSet().zCard(props.getSortedSetKey());
        assertThat(count).isEqualTo(1L);
        Double score = redisTemplate.opsForZSet().score(props.getSortedSetKey(),
                "user:" + alice.getId());
        assertThat(score).isNotNull();
    }

    @Test
    void anonymousGetPostsIssuesCookieAndBumpsAnon() throws Exception {
        MvcResult result = mvc.perform(get("/api/v1/posts")).andReturn();

        // Set-Cookie header should contain wr_presence_session
        String setCookie = result.getResponse().getHeader("Set-Cookie");
        assertThat(setCookie).isNotNull().contains("wr_presence_session=");

        Long count = redisTemplate.opsForZSet().zCard(props.getSortedSetKey());
        assertThat(count).isEqualTo(1L);

        // Member key starts with anon:
        var members = redisTemplate.opsForZSet().range(props.getSortedSetKey(), 0, -1);
        assertThat(members).isNotNull().hasSize(1);
        assertThat(members.iterator().next()).startsWith("anon:");
    }

    @Test
    void anonymousGetPostsReusesExistingCookie() throws Exception {
        String existingSession = java.util.UUID.randomUUID().toString();
        Cookie cookie = new Cookie("wr_presence_session", existingSession);

        MvcResult firstResult = mvc.perform(get("/api/v1/posts").cookie(cookie)).andReturn();
        // Should NOT issue a new cookie when an existing valid one is present
        assertThat(firstResult.getResponse().getHeader("Set-Cookie")).isNull();

        mvc.perform(get("/api/v1/posts").cookie(cookie));

        Long count = redisTemplate.opsForZSet().zCard(props.getSortedSetKey());
        assertThat(count).isEqualTo(1L);
        Double score = redisTemplate.opsForZSet().score(props.getSortedSetKey(),
                "anon:" + existingSession);
        assertThat(score).isNotNull();
    }

    @Test
    void postPostsDoesNotBump() throws Exception {
        User alice = userRepository.save(new User("alice-postpresence@test.local",
                "$2a$10$x", "Alice", "A", "UTC"));
        String jwt = jwtService.generateToken(alice.getId(), false);

        // POST without body will fail validation but should NOT bump presence.
        mvc.perform(get("/api/v1/posts").header("Authorization", "Bearer " + jwt));
        Long beforeCount = redisTemplate.opsForZSet().zCard(props.getSortedSetKey());
        // Reset
        redisTemplate.delete(props.getSortedSetKey());

        // POST should not bump.
        try {
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .post("/api/v1/posts")
                .header("Authorization", "Bearer " + jwt)
                .contentType("application/json")
                .content("{}"));
        } catch (Exception ignored) {
            // validation failure is fine; we're checking interceptor behavior
        }

        Long postCount = redisTemplate.opsForZSet().zCard(props.getSortedSetKey());
        assertThat(postCount).as("POST must not bump presence").isZero();
    }

    @Test
    void getPresenceDoesNotBump() throws Exception {
        // Hit the presence endpoint itself — interceptor must NOT be registered there.
        mvc.perform(get("/api/v1/prayer-wall/presence"));
        Long count = redisTemplate.opsForZSet().zCard(props.getSortedSetKey());
        assertThat(count).as("/prayer-wall/presence must not self-feed").isZero();
    }
}
