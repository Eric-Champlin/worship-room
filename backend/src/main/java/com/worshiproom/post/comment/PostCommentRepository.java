package com.worshiproom.post.comment;

import com.worshiproom.post.ModerationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PostCommentRepository
        extends JpaRepository<PostComment, UUID>, JpaSpecificationExecutor<PostComment> {

    // Top-level comments page. Sort handled by Pageable.
    Page<PostComment> findByPostIdAndParentCommentIdIsNullAndIsDeletedFalseAndModerationStatusIn(
            UUID postId, Collection<ModerationStatus> statuses, Pageable pageable);

    // Batch reply load (N+1 prevention per Spec 3.4 Watch-For #8).
    List<PostComment> findByParentCommentIdInAndIsDeletedFalseAndModerationStatusInOrderByCreatedAtAsc(
            Collection<UUID> parentIds, Collection<ModerationStatus> statuses);

    // Spec 3.6 write-side helpers.

    /** Live (not soft-deleted) comment lookup — used by updateComment + deleteComment. */
    Optional<PostComment> findByIdAndIsDeletedFalse(UUID id);

    /** Already-soft-deleted comment lookup — used by deleteComment idempotency check. */
    Optional<PostComment> findByIdAndIsDeletedTrue(UUID id);

    /**
     * Cross-post threaded-reply validation — the parent comment must (a) belong to the same
     * post the new reply is being posted on AND (b) not be soft-deleted. Spec D11.
     */
    Optional<PostComment> findByIdAndPostIdAndIsDeletedFalse(UUID id, UUID postId);
}
