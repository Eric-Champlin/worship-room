package com.worshiproom.post;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.worshiproom.auth.JwtService;
import com.worshiproom.mute.UserMute;
import com.worshiproom.mute.UserMuteRepository;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class PostControllerIntegrationTest extends AbstractIntegrationTest {

    private static final String TEST_JWT_SECRET =
            "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx";

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> TEST_JWT_SECRET);
        registry.add("auth.rate-limit.per-email.capacity", () -> "1000");
        registry.add("auth.rate-limit.per-ip.capacity", () -> "10000");
    }

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private UserRepository userRepository;
    @Autowired private UserMuteRepository muteRepository;
    @Autowired private PostRepository postRepository;
    @Autowired private JwtService jwtService;
    @Autowired private JdbcTemplate jdbc;

    private User alice;
    private User bob;
    private String aliceJwt;

    @BeforeEach
    void seed() {
        postRepository.deleteAll();
        userRepository.deleteAll();
        alice = userRepository.saveAndFlush(new User("alice-ctrl@test.local", "$2a$10$x",
                "Alice", "Anderson", "UTC"));
        bob = userRepository.saveAndFlush(new User("bob-ctrl@test.local", "$2a$10$x",
                "Bob", "Bennett", "UTC"));
        aliceJwt = jwtService.generateToken(alice.getId(), false);
    }

    private UUID seedPost(UUID userId, PostVisibility visibility, ModerationStatus status,
                          boolean deleted, boolean anonymous) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status,
                                   is_deleted, deleted_at, is_anonymous)
                VALUES (?, ?, 'prayer_request', 'controller test', ?, ?, ?, ?, ?)
                """,
                id, userId, visibility.value(), status.value(),
                deleted, deleted ? OffsetDateTime.now() : null, anonymous);
        return id;
    }

    // =====================================================================
    // GET /api/v1/posts
    // =====================================================================

    @Test
    void getPosts_unauthenticated_returns200WithPublicOnly() throws Exception {
        UUID publicPost = seedPost(alice.getId(), PostVisibility.PUBLIC, ModerationStatus.APPROVED, false, false);
        UUID privatePost = seedPost(alice.getId(), PostVisibility.PRIVATE, ModerationStatus.APPROVED, false, false);

        MvcResult result = mvc.perform(get("/api/v1/posts"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = mapper.readTree(result.getResponse().getContentAsString());
        JsonNode data = body.get("data");
        // Public post should be present, private should not
        boolean foundPublic = false;
        boolean foundPrivate = false;
        for (JsonNode p : data) {
            if (p.get("id").asText().equals(publicPost.toString())) foundPublic = true;
            if (p.get("id").asText().equals(privatePost.toString())) foundPrivate = true;
        }
        assertThat(foundPublic).isTrue();
        assertThat(foundPrivate).isFalse();
    }

    @Test
    void getPosts_authenticated_includesOwnPrivatePosts() throws Exception {
        UUID alicePrivate = seedPost(alice.getId(), PostVisibility.PRIVATE, ModerationStatus.APPROVED, false, false);

        MvcResult result = mvc.perform(get("/api/v1/posts").header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode data = mapper.readTree(result.getResponse().getContentAsString()).get("data");
        boolean foundOwnPrivate = false;
        for (JsonNode p : data) {
            if (p.get("id").asText().equals(alicePrivate.toString())) foundOwnPrivate = true;
        }
        assertThat(foundOwnPrivate).isTrue();
    }

    @Test
    void getPosts_invalidToken_returns401() throws Exception {
        mvc.perform(get("/api/v1/posts").header("Authorization", "Bearer not-a-real-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getPosts_responseShape_envelopeAndMeta() throws Exception {
        seedPost(alice.getId(), PostVisibility.PUBLIC, ModerationStatus.APPROVED, false, false);
        mvc.perform(get("/api/v1/posts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.meta.page").value(1))
                .andExpect(jsonPath("$.meta.limit").value(20))
                .andExpect(jsonPath("$.meta.totalCount").exists())
                .andExpect(jsonPath("$.meta.totalPages").exists())
                .andExpect(jsonPath("$.meta.hasNextPage").exists())
                .andExpect(jsonPath("$.meta.hasPrevPage").exists())
                .andExpect(jsonPath("$.meta.requestId").exists());
    }

    @Test
    void getPosts_xRequestIdHeader_matchesMetaRequestId() throws Exception {
        MvcResult result = mvc.perform(get("/api/v1/posts"))
                .andExpect(status().isOk())
                .andReturn();
        String headerRequestId = result.getResponse().getHeader("X-Request-Id");
        String bodyRequestId = mapper.readTree(result.getResponse().getContentAsString())
                .get("meta").get("requestId").asText();
        assertThat(headerRequestId).isNotNull().isEqualTo(bodyRequestId);
    }

    @Test
    void getPosts_limit51_returns400InvalidInput() throws Exception {
        mvc.perform(get("/api/v1/posts").param("limit", "51"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void getPosts_limit0_returns400InvalidInput() throws Exception {
        mvc.perform(get("/api/v1/posts").param("limit", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void getPosts_page0_returns400InvalidInput() throws Exception {
        mvc.perform(get("/api/v1/posts").param("page", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void getPosts_invalidCategory_returns400InvalidInput() throws Exception {
        mvc.perform(get("/api/v1/posts").param("category", "not-a-real-category"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void getPosts_invalidPostType_returns400InvalidInput() throws Exception {
        mvc.perform(get("/api/v1/posts").param("postType", "garbage"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void getPosts_invalidSort_returns400InvalidInput() throws Exception {
        mvc.perform(get("/api/v1/posts").param("sort", "foo"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void getPosts_mutedAuthor_filteredFromFeed() throws Exception {
        muteRepository.saveAndFlush(new UserMute(alice.getId(), bob.getId()));
        UUID bobPost = seedPost(bob.getId(), PostVisibility.PUBLIC, ModerationStatus.APPROVED, false, false);

        MvcResult result = mvc.perform(get("/api/v1/posts").header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode data = mapper.readTree(result.getResponse().getContentAsString()).get("data");
        for (JsonNode p : data) {
            assertThat(p.get("id").asText()).isNotEqualTo(bobPost.toString());
        }
    }

    // =====================================================================
    // GET /api/v1/posts/{id}
    // =====================================================================

    @Test
    void getPostById_anonymousPost_returnsAuthorIdAsLiteralNull() throws Exception {
        UUID anonId = seedPost(alice.getId(), PostVisibility.PUBLIC, ModerationStatus.APPROVED, false, true);
        MvcResult result = mvc.perform(get("/api/v1/posts/" + anonId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.author.displayName").value("Anonymous"))
                .andReturn();
        // Load-bearing Jackson contract: AuthorDto's @JsonInclude(Include.ALWAYS) must
        // override the global default-property-inclusion=non_null so the anonymous
        // author block has both `id` and `avatarUrl` PRESENT with value null (not
        // omitted). Walk the JSON tree anchored at data.author so the assertion
        // can't be satisfied by an unrelated nullable id elsewhere in the response.
        JsonNode author = mapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("author");
        assertThat(author.has("id"))
                .as("author.id must be present (not omitted by global non_null)")
                .isTrue();
        assertThat(author.get("id").isNull())
                .as("author.id must serialize as JSON null for anonymous post")
                .isTrue();
        assertThat(author.has("avatarUrl"))
                .as("author.avatarUrl must be present (not omitted by global non_null)")
                .isTrue();
        assertThat(author.get("avatarUrl").isNull())
                .as("author.avatarUrl must serialize as JSON null for anonymous post")
                .isTrue();
    }

    @Test
    void getPostById_nonexistent_returns404PostNotFound() throws Exception {
        UUID random = UUID.randomUUID();
        mvc.perform(get("/api/v1/posts/" + random))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("POST_NOT_FOUND"));
    }

    @Test
    void getPostById_softDeleted_returns404PostNotFound() throws Exception {
        UUID deleted = seedPost(alice.getId(), PostVisibility.PUBLIC, ModerationStatus.APPROVED, true, false);
        mvc.perform(get("/api/v1/posts/" + deleted))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("POST_NOT_FOUND"));
    }

    @Test
    void getPostById_visibilityExcluded_returns404NotForbidden() throws Exception {
        // Bob's private post — Alice cannot see → 404 (anti-enumeration), NOT 403
        UUID bobsPrivate = seedPost(bob.getId(), PostVisibility.PRIVATE, ModerationStatus.APPROVED, false, false);
        mvc.perform(get("/api/v1/posts/" + bobsPrivate)
                        .header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("POST_NOT_FOUND"));
    }

    @Test
    void getPostById_mutedAuthor_returnsPostAnyway() throws Exception {
        // Alice mutes Bob, but direct GET still returns Bob's post (Divergence 1)
        muteRepository.saveAndFlush(new UserMute(alice.getId(), bob.getId()));
        UUID bobPost = seedPost(bob.getId(), PostVisibility.PUBLIC, ModerationStatus.APPROVED, false, false);
        mvc.perform(get("/api/v1/posts/" + bobPost).header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(bobPost.toString()));
    }

    @Test
    void getPostById_malformedUuid_returns400() throws Exception {
        mvc.perform(get("/api/v1/posts/not-a-uuid"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    // =====================================================================
    // GET /api/v1/users/{username}/posts
    // =====================================================================

    @Test
    void getAuthorPosts_kebabCaseUsername_returnsMatchingPosts() throws Exception {
        UUID alicePost = seedPost(alice.getId(), PostVisibility.PUBLIC, ModerationStatus.APPROVED, false, false);
        UUID bobPost = seedPost(bob.getId(), PostVisibility.PUBLIC, ModerationStatus.APPROVED, false, false);

        MvcResult result = mvc.perform(get("/api/v1/users/alice-anderson/posts"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode data = mapper.readTree(result.getResponse().getContentAsString()).get("data");
        boolean hasAlice = false;
        boolean hasBob = false;
        for (JsonNode p : data) {
            String id = p.get("id").asText();
            if (id.equals(alicePost.toString())) hasAlice = true;
            if (id.equals(bobPost.toString())) hasBob = true;
        }
        assertThat(hasAlice).isTrue();
        assertThat(hasBob).isFalse();
    }

    @Test
    void getAuthorPosts_uuidUsername_returnsMatchingPosts() throws Exception {
        UUID alicePost = seedPost(alice.getId(), PostVisibility.PUBLIC, ModerationStatus.APPROVED, false, false);

        MvcResult result = mvc.perform(get("/api/v1/users/" + alice.getId() + "/posts"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode data = mapper.readTree(result.getResponse().getContentAsString()).get("data");
        boolean hasAlice = false;
        for (JsonNode p : data) {
            if (p.get("id").asText().equals(alicePost.toString())) hasAlice = true;
        }
        assertThat(hasAlice).isTrue();
    }

    @Test
    void getAuthorPosts_nonexistentUsername_returns200WithEmptyArray() throws Exception {
        mvc.perform(get("/api/v1/users/nobody-here/posts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(0))
                .andExpect(jsonPath("$.meta.totalCount").value(0));
    }

    @Test
    void getAuthorPosts_mutedAuthor_returnsEmptyArrayForViewer() throws Exception {
        muteRepository.saveAndFlush(new UserMute(alice.getId(), bob.getId()));
        seedPost(bob.getId(), PostVisibility.PUBLIC, ModerationStatus.APPROVED, false, false);

        // Alice (muter) requesting Bob's (muted) author posts → empty
        mvc.perform(get("/api/v1/users/bob-bennett/posts").header("Authorization", "Bearer " + aliceJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    // =====================================================================
    // Spec 4.6 — encouragement 24h feed expiry (read paths)
    // =====================================================================

    private UUID seedEncouragementWithAge(UUID userId, OffsetDateTime createdAt) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, category, visibility, moderation_status,
                                   is_deleted, is_anonymous, created_at)
                VALUES (?, ?, 'encouragement', 'enc test', 'other', 'public', 'approved', false, false, ?)
                """,
                id, userId, createdAt);
        return id;
    }

    @Test
    void getPosts_excludesEncouragementsOlderThan24Hours() throws Exception {
        UUID recentEnc = seedEncouragementWithAge(alice.getId(), OffsetDateTime.now().minusHours(1));
        UUID expiredEnc = seedEncouragementWithAge(alice.getId(), OffsetDateTime.now().minusHours(48));

        MvcResult result = mvc.perform(get("/api/v1/posts"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode data = mapper.readTree(result.getResponse().getContentAsString()).get("data");

        boolean foundRecent = false;
        boolean foundExpired = false;
        for (JsonNode p : data) {
            if (p.get("id").asText().equals(recentEnc.toString())) foundRecent = true;
            if (p.get("id").asText().equals(expiredEnc.toString())) foundExpired = true;
        }
        assertThat(foundRecent).isTrue();
        assertThat(foundExpired).isFalse();
    }

    @Test
    void getPostById_returnsExpiredEncouragement_byDirectIdLookup() throws Exception {
        // D17 — direct ID lookup bypasses notExpired() so bookmarks resolve.
        UUID expiredEnc = seedEncouragementWithAge(alice.getId(), OffsetDateTime.now().minusHours(48));

        mvc.perform(get("/api/v1/posts/" + expiredEnc))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(expiredEnc.toString()))
                .andExpect(jsonPath("$.data.postType").value("encouragement"));
    }
}
