package com.worshiproom.post.engagement;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BookmarkRepository
        extends JpaRepository<PostBookmark, PostBookmarkId>, BookmarkRepositoryCustom {

    // Used by ReactionsResponse builder — flat list of postIds bookmarked by viewer.
    List<PostBookmark> findByUserId(UUID userId);

    /** Spec 3.7 — existence check for idempotent POST/DELETE paths. */
    boolean existsByPostIdAndUserId(UUID postId, UUID userId);

    /**
     * Spec 3.7 — single-statement DELETE (returns row count) for idempotent DELETE path.
     *
     * <p>The {@code int} return lets {@code BookmarkWriteService.remove} skip the counter
     * decrement when no row was actually deleted (idempotent — same response either way).
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM PostBookmark b WHERE b.postId = :postId AND b.userId = :userId")
    int deleteByPostIdAndUserId(@Param("postId") UUID postId, @Param("userId") UUID userId);
}
