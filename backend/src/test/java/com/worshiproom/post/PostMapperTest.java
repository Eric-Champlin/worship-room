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
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, is_anonymous, visibility, moderation_status)
                VALUES (?, ?, 'prayer_request', 'mapper test content', ?, 'public', 'approved')
                """,
                id, userId, anonymous);
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
}
