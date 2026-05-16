package com.worshiproom.post;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.worshiproom.auth.JwtService;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Spec 7.4 — Controller-level integration tests for
 * {@code GET /api/v1/users/me/friend-prayers-today}.
 *
 * <p>Three gates:
 * <ul>
 *   <li>Authenticated user receives 200 with the standard PostListResponse shape.</li>
 *   <li>Unauthenticated request returns 401 (SecurityConfig method-specific rule fires).</li>
 *   <li>Per-user rate limit returns 429 with a {@code Retry-After} header after the
 *       configured limit is exhausted.</li>
 * </ul>
 *
 * <p>The rate-limit cap is dropped to 2/min for this test class via a sibling
 * {@code @DynamicPropertySource} method — Spring aggregates across the inheritance
 * hierarchy and the override layers on top of {@link AbstractIntegrationTest}'s
 * base registrations.
 */
@AutoConfigureMockMvc
class FriendPrayersControllerTest extends AbstractIntegrationTest {

    private static final String TEST_JWT_SECRET =
            "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx";

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> TEST_JWT_SECRET);
        registry.add("auth.rate-limit.per-email.capacity", () -> "1000");
        registry.add("auth.rate-limit.per-ip.capacity", () -> "10000");
        // Drop the friend-prayers rate limit to 2/min so test 3 can saturate it
        // without making dozens of HTTP calls. Subclass override wins over the
        // dev/prod defaults via Spring's @DynamicPropertySource aggregation.
        registry.add("worshiproom.friend-prayers.rate-limit.requests-per-minute", () -> "2");
    }

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private UserRepository userRepository;
    @Autowired private PostRepository postRepository;
    @Autowired private JwtService jwtService;
    @Autowired private JdbcTemplate jdbc;

    private User viewer;
    private User friend;
    private String viewerJwt;

    @BeforeEach
    void seed() {
        jdbc.update("DELETE FROM quick_lift_sessions");
        jdbc.update("DELETE FROM user_mutes");
        jdbc.update("DELETE FROM friend_relationships");
        postRepository.deleteAll();
        userRepository.deleteAll();

        viewer = userRepository.saveAndFlush(new User(
                "viewer-fpc-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local",
                "$2a$10$placeholderplaceholderplaceholderplaceholderplaceholder",
                "Viewer", "Test", "UTC"));
        friend = userRepository.saveAndFlush(new User(
                "friend-fpc-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local",
                "$2a$10$placeholderplaceholderplaceholderplaceholderplaceholder",
                "Friend", "Test", "UTC"));
        viewerJwt = jwtService.generateToken(viewer.getId(), false);
    }

    private void seedFriendship(UUID authorId, UUID viewerId) {
        jdbc.update("""
                INSERT INTO friend_relationships (user_id, friend_user_id, status)
                VALUES (?, ?, 'active')
                """, authorId, viewerId);
    }

    private UUID seedFriendPost() {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status,
                                   created_at, updated_at, last_activity_at)
                VALUES (?, ?, 'prayer_request', 'pray for me', 'public', 'approved',
                        ?, ?, ?)
                """, id, friend.getId(),
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(2),
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(2),
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(2));
        return id;
    }

    // ─── Test 10: G-AUTHENTICATED-ACCESS ───────────────────────────────────

    @Test
    void authenticatedReturnsTwoHundred() throws Exception {
        seedFriendship(friend.getId(), viewer.getId());
        UUID a = seedFriendPost();
        UUID b = seedFriendPost();

        MvcResult result = mvc.perform(get("/api/v1/users/me/friend-prayers-today")
                        .header("Authorization", "Bearer " + viewerJwt))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode body = mapper.readTree(result.getResponse().getContentAsString());
        JsonNode data = body.get("data");
        assertThat(data.isArray()).isTrue();
        assertThat(data.size()).isEqualTo(2);
        assertThat(body.get("meta").get("page").asInt()).isEqualTo(1);
        assertThat(body.get("meta").get("limit").asInt()).isEqualTo(3);
        assertThat(body.get("meta").get("totalCount").asInt()).isEqualTo(2);
        assertThat(body.get("meta").get("hasNextPage").asBoolean()).isFalse();
        assertThat(body.get("meta").get("hasPrevPage").asBoolean()).isFalse();

        // Sanity: both seeded post IDs appear.
        boolean foundA = false;
        boolean foundB = false;
        for (JsonNode p : data) {
            if (p.get("id").asText().equals(a.toString())) foundA = true;
            if (p.get("id").asText().equals(b.toString())) foundB = true;
        }
        assertThat(foundA).isTrue();
        assertThat(foundB).isTrue();
    }

    // ─── Test 11: G-UNAUTHENTICATED-401 ────────────────────────────────────

    @Test
    void unauthenticatedReturnsFourOhOne() throws Exception {
        mvc.perform(get("/api/v1/users/me/friend-prayers-today"))
                .andExpect(status().isUnauthorized());
    }

    // ─── Test 12: G-RATE-LIMITED ───────────────────────────────────────────

    @Test
    void rateLimitReturnsFourTwentyNineWithRetryAfter() throws Exception {
        // Rate limit override (2/min) lives in @DynamicPropertySource above.
        // Two successful calls, then the third is rate-limited.
        mvc.perform(get("/api/v1/users/me/friend-prayers-today")
                        .header("Authorization", "Bearer " + viewerJwt))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/users/me/friend-prayers-today")
                        .header("Authorization", "Bearer " + viewerJwt))
                .andExpect(status().isOk());

        MvcResult result = mvc.perform(get("/api/v1/users/me/friend-prayers-today")
                        .header("Authorization", "Bearer " + viewerJwt))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists(HttpHeaders.RETRY_AFTER))
                .andReturn();

        String retryAfterValue = result.getResponse().getHeader(HttpHeaders.RETRY_AFTER);
        assertThat(retryAfterValue).isNotNull();
        long retryAfterSec = Long.parseLong(retryAfterValue);
        assertThat(retryAfterSec).isGreaterThan(0);
    }
}
