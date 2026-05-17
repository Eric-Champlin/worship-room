package com.worshiproom.post;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.worshiproom.post.dto.AuthorDto;
import com.worshiproom.post.dto.PostDto;
import com.worshiproom.support.AbstractDataJpaTest;
import com.worshiproom.user.DisplayNamePreference;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.hibernate.Session;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.lang.reflect.RecordComponent;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies {@link PostMapper}'s anonymous-author handling, enum-to-string
 * serialization, exclusion of moderation-internal fields, batch N+1 avoidance,
 * and the load-bearing Jackson contract that anonymous {@code author.id} is
 * serialized as {@code "id":null} (not omitted).
 */
@Import({PostMapperTest.PostMapperTestConfig.class, PostMapper.class})
class PostMapperTest extends AbstractDataJpaTest {

    @TestConfiguration
    static class PostMapperTestConfig {
        @Bean
        ObjectMapper objectMapper() {
            ObjectMapper m = new ObjectMapper();
            // Mirror the global Spring Jackson default-property-inclusion=non_null setting
            // so this test catches the same omission behavior the production runtime exhibits.
            m.setSerializationInclusion(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL);
            return m;
        }

        // Spec 4.6b — PostMapper now depends on ObjectStorageAdapter (for presigned-URL
        // generation when post.imageUrl is set) and StorageProperties (for max-presign-hours
        // TTL). The slice test mocks them to a no-op shape — none of the existing
        // PostMapperTest cases set imageUrl, so generatePresignedUrl is never invoked. New
        // image-specific PostMapper tests (Step 18) bring their own mocks.
        @Bean
        com.worshiproom.storage.ObjectStorageAdapter testObjectStorageAdapter() {
            return org.mockito.Mockito.mock(com.worshiproom.storage.ObjectStorageAdapter.class);
        }

        @Bean
        com.worshiproom.storage.StorageProperties testStorageProperties() {
            com.worshiproom.storage.StorageProperties props = new com.worshiproom.storage.StorageProperties();
            props.setMaxPresignHours(1);
            return props;
        }
    }

    @Autowired private PostMapper postMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ObjectMapper objectMapper;

    @PersistenceContext
    private EntityManager entityManager;

    private User author;

    @BeforeEach
    void seedAuthor() {
        author = userRepository.saveAndFlush(new User(
                "mapper-author-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local",
                "$2a$10$placeholderplaceholderplaceholderplaceholderplaceholder",
                "Sarah", "Johnson", "UTC"));
    }

    private Post seedPost(UUID userId, boolean anonymous) {
        return seedPost(userId, anonymous, PostVisibility.PUBLIC);
    }

    private Post seedPost(UUID userId, boolean anonymous, PostVisibility visibility) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, is_anonymous, visibility, moderation_status)
                VALUES (?, ?, 'prayer_request', 'mapper test content', ?, ?, 'approved')
                """,
                id, userId, anonymous, visibility.value());
        return jdbc.queryForObject(
                "SELECT id FROM posts WHERE id = ?",
                (rs, n) -> entityManager.find(Post.class, rs.getObject("id", UUID.class)),
                id);
    }

    @Test
    void toDto_anonymousPost_returnsAnonymousAuthor() {
        Post post = seedPost(author.getId(), true);
        PostDto dto = postMapper.toDto(post);
        assertThat(dto.author().id()).isNull();
        assertThat(dto.author().displayName()).isEqualTo("Anonymous");
        assertThat(dto.author().avatarUrl()).isNull();
        assertThat(dto.isAnonymous()).isTrue();
    }

    @Test
    void toDto_normalPost_resolvesDisplayName() {
        author.setDisplayNamePreference(DisplayNamePreference.FIRST_ONLY);
        userRepository.saveAndFlush(author);
        Post post = seedPost(author.getId(), false);
        PostDto dto = postMapper.toDto(post);
        assertThat(dto.author().id()).isEqualTo(author.getId());
        assertThat(dto.author().displayName()).isEqualTo("Sarah");
    }

    @Test
    void toDto_serializesEnumAsDbValue() {
        Post post = seedPost(author.getId(), false);
        PostDto dto = postMapper.toDto(post);
        assertThat(dto.postType()).isEqualTo("prayer_request");
        assertThat(dto.visibility()).isEqualTo("public");
        assertThat(dto.moderationStatus()).isEqualTo("approved");
    }

    /**
     * Spec 7.7 — confirms PostMapper round-trips every PostVisibility enum value
     * to the correct wire string on PostDto. The existing
     * {@link #toDto_serializesEnumAsDbValue()} test covers only PUBLIC; this
     * parameterized test covers all three enum values
     * (Gate-G-DTO-VISIBILITY-MAPPED).
     */
    @ParameterizedTest
    @EnumSource(PostVisibility.class)
    void toDto_visibilityRoundTripsForAllEnumValues(PostVisibility visibility) {
        Post post = seedPost(author.getId(), false, visibility);
        PostDto dto = postMapper.toDto(post);
        assertThat(dto.visibility()).isEqualTo(visibility.value());
    }

    @Test
    void toDto_excludesInternalFields() {
        // Reflection-verify that the PostDto record has no component for these fields
        List<String> componentNames = Arrays.stream(PostDto.class.getRecordComponents())
                .map(RecordComponent::getName)
                .toList();
        assertThat(componentNames)
                .doesNotContain("isDeleted", "deletedAt", "reportCount");
    }

    @Test
    void toDtoList_avoidsNPlusOne() {
        // Seed 10 posts spanning 5 distinct authors
        List<User> authors = List.of(
                author,
                userRepository.saveAndFlush(new User("a2-" + UUID.randomUUID() + "@t.l", "$2a$10$x", "A2", "U", "UTC")),
                userRepository.saveAndFlush(new User("a3-" + UUID.randomUUID() + "@t.l", "$2a$10$x", "A3", "U", "UTC")),
                userRepository.saveAndFlush(new User("a4-" + UUID.randomUUID() + "@t.l", "$2a$10$x", "A4", "U", "UTC")),
                userRepository.saveAndFlush(new User("a5-" + UUID.randomUUID() + "@t.l", "$2a$10$x", "A5", "U", "UTC"))
        );
        List<Post> posts = new java.util.ArrayList<>();
        for (int i = 0; i < 10; i++) {
            posts.add(seedPost(authors.get(i % 5).getId(), false));
        }
        entityManager.clear();

        Session session = entityManager.unwrap(Session.class);
        Statistics stats = session.getSessionFactory().getStatistics();
        stats.setStatisticsEnabled(true);
        stats.clear();

        // Re-fetch posts via JPA so they are managed entities for mapping
        List<Post> managed = posts.stream()
                .map(p -> entityManager.find(Post.class, p.getId()))
                .toList();
        long queriesBeforeMap = stats.getPrepareStatementCount();

        postMapper.toDtoList(managed);

        long queriesAfterMap = stats.getPrepareStatementCount();
        long mapperQueries = queriesAfterMap - queriesBeforeMap;
        // Expect exactly ONE query for the batched user load (findAllById)
        assertThat(mapperQueries)
                .as("toDtoList should issue exactly one user-loading query for the batch")
                .isEqualTo(1L);
    }

    @Test
    void toDto_questionResolvedCommentId_isNullByDefault() {
        Post post = seedPost(author.getId(), false);
        PostDto dto = postMapper.toDto(post);
        assertThat(dto.questionResolvedCommentId()).isNull();
    }

    @Test
    void toDto_populatesQuestionResolvedCommentId() {
        // Seed a post then assign the resolved comment pointer directly. We
        // bypass the FK by passing a UUID that does not need to reference a
        // real comment for this serialization test (the foreign key is checked
        // at flush time, not when a managed entity's field is set, so we use
        // a JDBC update to write the value and re-load).
        Post post = seedPost(author.getId(), false);
        UUID commentId = UUID.randomUUID();
        // Insert a sham comment row to satisfy the FK
        UUID userId = author.getId();
        jdbc.update("""
                INSERT INTO post_comments (id, post_id, user_id, content)
                VALUES (?, ?, ?, 'comment for resolved test')
                """, commentId, post.getId(), userId);
        jdbc.update(
                "UPDATE posts SET question_resolved_comment_id = ? WHERE id = ?",
                commentId, post.getId());
        entityManager.clear();
        Post reloaded = entityManager.find(Post.class, post.getId());
        PostDto dto = postMapper.toDto(reloaded);
        assertThat(dto.questionResolvedCommentId()).isEqualTo(commentId);
    }

    @Test
    void serializeAnonymousAuthorDto_idFieldIsPresentWithNullValue() throws Exception {
        // The class-level @JsonInclude(ALWAYS) on AuthorDto must override the
        // global default-property-inclusion=non_null so id renders as "id":null
        // rather than being omitted entirely.
        AuthorDto anonymous = new AuthorDto(null, "Anonymous", null);
        String json = objectMapper.writeValueAsString(anonymous);
        assertThat(json).contains("\"id\":null");
        assertThat(json).contains("\"displayName\":\"Anonymous\"");
    }

    // =====================================================================
    // Spec 4.6b — image presigned-URL generation (3 tests)
    // =====================================================================

    @Autowired
    private com.worshiproom.storage.ObjectStorageAdapter storageMock;
    @Autowired
    private com.worshiproom.storage.StorageProperties storageProps;

    @Test
    void toDto_with_image_url_set_includes_image_dto_with_three_presigned_urls() {
        Post post = seedPost(author.getId(), false);
        // Set image columns directly; entity already loaded via JdbcTemplate seed.
        UUID postId = post.getId();
        jdbc.update(
                "UPDATE posts SET image_url = ?, image_alt_text = ? WHERE id = ?",
                "posts/" + postId, "A descriptive alt text", postId);
        entityManager.clear();
        Post reloaded = entityManager.find(Post.class, postId);

        org.mockito.Mockito.when(storageMock.generatePresignedUrl(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(java.time.Duration.class)))
                .thenAnswer(inv -> "https://signed/" + inv.getArgument(0));

        PostDto dto = postMapper.toDto(reloaded);

        assertThat(dto.image()).isNotNull();
        assertThat(dto.image().fullUrl()).isEqualTo("https://signed/posts/" + postId + "/full.jpg");
        assertThat(dto.image().mediumUrl()).isEqualTo("https://signed/posts/" + postId + "/medium.jpg");
        assertThat(dto.image().thumbUrl()).isEqualTo("https://signed/posts/" + postId + "/thumb.jpg");
        assertThat(dto.image().altText()).isEqualTo("A descriptive alt text");
    }

    @Test
    void toDto_without_image_url_returns_null_image() {
        Post post = seedPost(author.getId(), false);
        // image_url remains null per the seedPost INSERT — null is the default.

        PostDto dto = postMapper.toDto(post);

        // dto.image() is null AND post.imageUrl was null are sufficient verification.
        // Verifying generatePresignedUrl was-not-called would be flaky here because the
        // shared Spring-bean Mockito mock accumulates invocations across this test class's
        // test methods.
        assertThat(dto.image()).isNull();
        assertThat(post.getImageUrl()).isNull();
    }

    @Test
    void toDto_uses_configured_max_presign_hours_for_TTL() {
        storageProps.setMaxPresignHours(3);
        Post post = seedPost(author.getId(), false);
        UUID postId = post.getId();
        jdbc.update("UPDATE posts SET image_url = ?, image_alt_text = ? WHERE id = ?",
                "posts/" + postId, "alt", postId);
        entityManager.clear();
        Post reloaded = entityManager.find(Post.class, postId);

        org.mockito.ArgumentCaptor<java.time.Duration> durationCaptor =
                org.mockito.ArgumentCaptor.forClass(java.time.Duration.class);
        org.mockito.Mockito.when(storageMock.generatePresignedUrl(
                org.mockito.ArgumentMatchers.anyString(), durationCaptor.capture()))
                .thenReturn("https://signed");

        postMapper.toDto(reloaded);

        // Captured 3 times (one per rendition); all three should carry the configured TTL.
        durationCaptor.getAllValues().forEach(d ->
                assertThat(d).isEqualTo(java.time.Duration.ofHours(3)));
        // Reset for other tests
        storageProps.setMaxPresignHours(1);
    }

    // =====================================================================
    // Spec 4.7b — help_tags read-side mapping (3 tests)
    // =====================================================================

    @Test
    void toDto_with_empty_helpTagsRaw_includes_empty_set() {
        Post post = seedPost(author.getId(), false);
        // seedPost INSERT does not write help_tags; DB DEFAULT '' supplies it.
        PostDto dto = postMapper.toDto(post);
        assertThat(dto.helpTags()).isEmpty();
    }

    @Test
    void toDto_with_meals_rides_helpTagsRaw_includes_meals_rides_in_canonical_order() {
        Post post = seedPost(author.getId(), false);
        jdbc.update("UPDATE posts SET help_tags = ? WHERE id = ?", "meals,rides", post.getId());
        entityManager.clear();
        Post reloaded = entityManager.find(Post.class, post.getId());

        PostDto dto = postMapper.toDto(reloaded);

        // LinkedHashSet preserves storage order; storage is canonical.
        assertThat(dto.helpTags()).containsExactly("meals", "rides");
    }

    @Test
    void toDto_just_prayer_helpTagsRaw_includes_just_prayer_in_set() {
        // Frontend filters just_prayer at render time (D8 / W5); the DTO MUST
        // still include it for AI / analytics use cases (D6).
        Post post = seedPost(author.getId(), false);
        jdbc.update("UPDATE posts SET help_tags = ? WHERE id = ?", "just_prayer", post.getId());
        entityManager.clear();
        Post reloaded = entityManager.find(Post.class, post.getId());

        PostDto dto = postMapper.toDto(reloaded);

        assertThat(dto.helpTags()).containsExactly("just_prayer");
    }

    // =====================================================================
    // Spec 7.6 — isFromFriend flag in toDtoList (5 tests)
    // =====================================================================

    @Test
    void toDtoList_withFriendPinSet_marksContainedPostsAsFromFriend() {
        Post p1 = seedPost(author.getId(), false);
        Post p2 = seedPost(author.getId(), false);
        Post p3 = seedPost(author.getId(), false);

        List<PostDto> dtos = postMapper.toDtoList(
                List.of(p1, p2, p3),
                java.util.Map.of(),
                java.util.Set.of(p1.getId(), p3.getId()));

        assertThat(dtos).hasSize(3);
        // dtos may not be in input order if internal stream changes; assert by id lookup.
        PostDto dto1 = dtos.stream().filter(d -> d.id().equals(p1.getId())).findFirst().orElseThrow();
        PostDto dto2 = dtos.stream().filter(d -> d.id().equals(p2.getId())).findFirst().orElseThrow();
        PostDto dto3 = dtos.stream().filter(d -> d.id().equals(p3.getId())).findFirst().orElseThrow();
        assertThat(dto1.isFromFriend()).isTrue();
        assertThat(dto2.isFromFriend()).isFalse();
        assertThat(dto3.isFromFriend()).isTrue();
    }

    @Test
    void toDtoList_withEmptyFriendPinSet_marksAllAsNotFromFriend() {
        Post p1 = seedPost(author.getId(), false);
        Post p2 = seedPost(author.getId(), false);
        Post p3 = seedPost(author.getId(), false);

        List<PostDto> dtos = postMapper.toDtoList(
                List.of(p1, p2, p3),
                java.util.Map.of(),
                java.util.Set.of());

        assertThat(dtos).hasSize(3);
        assertThat(dtos).allMatch(d -> !d.isFromFriend());
    }

    @Test
    void toDtoList_twoArgOverload_defaultsToNotFromFriend() {
        // Regression guard that the 2-arg overload's Set.of() delegation works correctly.
        Post p1 = seedPost(author.getId(), false);
        Post p2 = seedPost(author.getId(), false);
        Post p3 = seedPost(author.getId(), false);

        List<PostDto> dtos = postMapper.toDtoList(List.of(p1, p2, p3), java.util.Map.of());

        assertThat(dtos).hasSize(3);
        assertThat(dtos).allMatch(d -> !d.isFromFriend());
    }

    @Test
    void toDto_singlePost_defaultsToNotFromFriend() {
        // Regression guard for the single-post path.
        Post post = seedPost(author.getId(), false);

        PostDto dto = postMapper.toDto(post);

        assertThat(dto.isFromFriend()).isFalse();
    }

    @Test
    void toDtoList_anonymousPostInFriendPin_stillMarkedAsFromFriend() {
        // Spec 7.6 Gate-G-ANONYMOUS-CHIP-RESPECTED (backend half) — anonymous
        // friend posts still get the chip; the author display is "Anonymous"
        // (no identity leak), but the relationship indicator stands.
        Post anonymous = seedPost(author.getId(), true);

        List<PostDto> dtos = postMapper.toDtoList(
                List.of(anonymous),
                java.util.Map.of(),
                java.util.Set.of(anonymous.getId()));

        assertThat(dtos).hasSize(1);
        assertThat(dtos.get(0).isFromFriend()).isTrue();
        assertThat(dtos.get(0).author().displayName()).isEqualTo("Anonymous");
        assertThat(dtos.get(0).author().id()).isNull();
    }
}
