package com.worshiproom.post.comment;

import com.worshiproom.post.ModerationStatus;
import com.worshiproom.post.comment.dto.CommentDto;
import com.worshiproom.post.dto.AuthorDto;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for the Spec 3.6 single-comment mapper signature
 * {@link PostCommentMapper#toDto(PostComment, AuthorDto)}.
 *
 * <p>The pre-existing batch path ({@code toDtoList}) is exercised by the read-side
 * Spec 3.4 tests; this class focuses on the new write-response shape: every field
 * populated, {@code moderationStatus} surfaced as the wire string ({@code "approved"}),
 * {@code replies} always an empty list (never null).
 */
@ExtendWith(MockitoExtension.class)
class PostCommentMapperTest {

    @Mock private UserRepository userRepository;

    private PostComment buildComment(UUID id, UUID postId, UUID userId,
                                     UUID parentCommentId, boolean crisisFlag) {
        PostComment c = new PostComment();
        c.setId(id);
        c.setPostId(postId);
        c.setUserId(userId);
        c.setParentCommentId(parentCommentId);
        c.setContent("Praying for you.");
        c.setHelpful(false);
        c.setDeleted(false);
        c.setModerationStatus(ModerationStatus.APPROVED);
        c.setCrisisFlag(crisisFlag);
        // createdAt + updatedAt are DB-managed (insertable=false). They remain
        // null on freshly-built entities; the integration test guards
        // entityManager.refresh(...) populating them in production.
        return c;
    }

    @Test
    void toDto_topLevelCommentReturnsExpectedShape() {
        PostCommentMapper mapper = new PostCommentMapper(userRepository);

        UUID id = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        AuthorDto author = new AuthorDto(userId, "Alice", null);

        PostComment c = buildComment(id, postId, userId, null, false);
        CommentDto dto = mapper.toDto(c, author);

        assertThat(dto.id()).isEqualTo(id);
        assertThat(dto.postId()).isEqualTo(postId);
        assertThat(dto.parentCommentId()).isNull();
        assertThat(dto.content()).isEqualTo("Praying for you.");
        assertThat(dto.isHelpful()).isFalse();
        assertThat(dto.moderationStatus()).isEqualTo("approved");
        assertThat(dto.crisisFlag()).isFalse();
        assertThat(dto.author()).isEqualTo(author);
        assertThat(dto.replies())
                .as("write responses must always carry an empty replies list, never null")
                .isNotNull()
                .isEmpty();
    }

    @Test
    void toDto_threadedReplyPopulatesParentCommentId() {
        PostCommentMapper mapper = new PostCommentMapper(userRepository);

        UUID parentCommentId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        AuthorDto author = new AuthorDto(userId, "Bob", null);

        PostComment c = buildComment(UUID.randomUUID(), UUID.randomUUID(),
                userId, parentCommentId, false);
        CommentDto dto = mapper.toDto(c, author);

        assertThat(dto.parentCommentId()).isEqualTo(parentCommentId);
    }

    @Test
    void toDto_crisisFlaggedCommentSurfacesFlagInDto() {
        PostCommentMapper mapper = new PostCommentMapper(userRepository);

        UUID userId = UUID.randomUUID();
        AuthorDto author = new AuthorDto(userId, "Bob", null);

        PostComment c = buildComment(UUID.randomUUID(), UUID.randomUUID(),
                userId, null, true);
        CommentDto dto = mapper.toDto(c, author);

        assertThat(dto.crisisFlag()).isTrue();
    }
}
