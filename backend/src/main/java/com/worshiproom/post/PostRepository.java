package com.worshiproom.post;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PostRepository extends JpaRepository<Post, UUID>, JpaSpecificationExecutor<Post> {

    /**
     * Lookup for write paths (PATCH/DELETE). Returns a live post regardless of
     * visibility — author ownership is enforced at the service layer, not the
     * query layer (different from read paths which use the visibility predicate).
     *
     * Returns empty when the post does not exist OR is soft-deleted. Both cases
     * map to 404 POST_NOT_FOUND in PostService.updatePost / deletePost.
     */
    Optional<Post> findByIdAndIsDeletedFalse(UUID id);

    /**
     * For DELETE idempotency: when a soft-deleted post is DELETE'd again, the
     * service short-circuits to 204 instead of 404. This finder lets the
     * service distinguish "never existed" from "already deleted".
     */
    Optional<Post> findByIdAndIsDeletedTrue(UUID id);

    /**
     * SQL-side comment-count increment + last_activity_at bump (Spec 3.6).
     *
     * <p>Atomic single-statement update — the JPA-side {@code commentCount = commentCount + 1}
     * pattern would lose updates under concurrent comment creation (read-modify-write race).
     *
     * <p>Returns rows affected. The service asserts {@code == 1} after the call to detect
     * the TOCTOU case where the parent post was deleted between the existence check and the
     * counter update.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Post p SET p.commentCount = p.commentCount + 1, p.lastActivityAt = CURRENT_TIMESTAMP WHERE p.id = :postId")
    int incrementCommentCountAndBumpLastActivity(@Param("postId") UUID postId);

    /**
     * SQL-side comment-count decrement with {@code > 0} guard (Spec 3.6 Decision D9).
     *
     * <p>Returns rows affected. Under any race, the {@code > 0} guard correctly produces 0
     * rows affected and the service treats that as "counter already at floor, no-op". Any
     * negative drift would be a bug. Per spec, NO {@code last_activity_at} bump on delete —
     * delete is author-side intent, not engagement signal.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Post p SET p.commentCount = p.commentCount - 1 WHERE p.id = :postId AND p.commentCount > 0")
    int decrementCommentCount(@Param("postId") UUID postId);

    /**
     * SQL-side increment for praying counter (Spec 3.7 reaction-add path).
     *
     * <p>Atomic single-statement update — race-safe under concurrent reactions.
     *
     * <p>NO {@code last_activity_at} bump (Spec 3.7 R9). Reactions are
     * low-friction social signals that should not artificially promote posts
     * in the BUMPED feed sort.
     *
     * <p>Returns rows affected. Service asserts {@code == 1} after the call to
     * detect TOCTOU where the parent post disappeared between the visibility
     * check and the counter update.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Post p SET p.prayingCount = p.prayingCount + 1 WHERE p.id = :postId")
    int incrementPrayingCount(@Param("postId") UUID postId);

    /**
     * SQL-side decrement for praying counter with {@code > 0} guard
     * (Spec 3.7 reaction-remove path; mirrors Spec 3.6 D9).
     *
     * <p>Under any race, the {@code > 0} guard correctly produces 0 rows
     * affected and the service treats that as "counter already at floor,
     * no-op." Negative drift would be a bug. NO {@code last_activity_at} bump.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Post p SET p.prayingCount = p.prayingCount - 1 WHERE p.id = :postId AND p.prayingCount > 0")
    int decrementPrayingCount(@Param("postId") UUID postId);

    /** SQL-side increment for candle counter (Spec 3.7). NO {@code last_activity_at} bump. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Post p SET p.candleCount = p.candleCount + 1 WHERE p.id = :postId")
    int incrementCandleCount(@Param("postId") UUID postId);

    /** SQL-side decrement for candle counter with {@code > 0} guard (Spec 3.7). NO {@code last_activity_at} bump. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Post p SET p.candleCount = p.candleCount - 1 WHERE p.id = :postId AND p.candleCount > 0")
    int decrementCandleCount(@Param("postId") UUID postId);

    /** SQL-side increment for praising counter (Spec 6.6 Answered Wall). NO {@code last_activity_at} bump. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Post p SET p.praisingCount = p.praisingCount + 1 WHERE p.id = :postId")
    int incrementPraisingCount(@Param("postId") UUID postId);

    /** SQL-side decrement for praising counter with {@code > 0} guard (Spec 6.6). NO {@code last_activity_at} bump. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Post p SET p.praisingCount = p.praisingCount - 1 WHERE p.id = :postId AND p.praisingCount > 0")
    int decrementPraisingCount(@Param("postId") UUID postId);

    /** SQL-side increment for celebrate counter (Spec 6.6b Answered Wall). NO {@code last_activity_at} bump. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Post p SET p.celebrateCount = p.celebrateCount + 1 WHERE p.id = :postId")
    int incrementCelebrateCount(@Param("postId") UUID postId);

    /** SQL-side decrement for celebrate counter with {@code > 0} guard (Spec 6.6b). NO {@code last_activity_at} bump. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Post p SET p.celebrateCount = p.celebrateCount - 1 WHERE p.id = :postId AND p.celebrateCount > 0")
    int decrementCelebrateCount(@Param("postId") UUID postId);

    /** SQL-side increment for bookmark counter (Spec 3.7). NO {@code last_activity_at} bump (private action). */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Post p SET p.bookmarkCount = p.bookmarkCount + 1 WHERE p.id = :postId")
    int incrementBookmarkCount(@Param("postId") UUID postId);

    /** SQL-side decrement for bookmark counter with {@code > 0} guard (Spec 3.7). NO {@code last_activity_at} bump. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Post p SET p.bookmarkCount = p.bookmarkCount - 1 WHERE p.id = :postId AND p.bookmarkCount > 0")
    int decrementBookmarkCount(@Param("postId") UUID postId);
}
