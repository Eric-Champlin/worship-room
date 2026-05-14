package com.worshiproom.post;

import com.worshiproom.friends.FriendRelationship;
import com.worshiproom.friends.FriendRelationshipStatus;
import com.worshiproom.mute.UserMute;
import com.worshiproom.user.User;
import jakarta.annotation.Nullable;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/**
 * Composable JPA Specification building blocks for Post queries.
 *
 * Visibility predicate is the load-bearing correctness concern — a buggy
 * visibleTo() leaks private content. Mirror of master plan Spec 7.7 SQL
 * (line 6307–6321) is documented inline as JavaDoc on visibleTo().
 *
 * Mute filter is composed at the feed and author-posts call sites only,
 * NOT at single-post detail (Spec 3.3 Divergence 1 — direct ID lookups
 * bypass discovery filters).
 */
public final class PostSpecifications {

    private PostSpecifications() {}

    /**
     * Canonical visibility predicate (master plan Spec 7.7, line 6307–6321):
     *
     * <pre>
     *   WHERE posts.is_deleted = FALSE
     *     AND posts.moderation_status IN ('approved', 'flagged')
     *     AND (
     *           posts.visibility = 'public'
     *        OR (posts.visibility = 'friends'
     *            AND :viewer_id IS NOT NULL
     *            AND EXISTS (SELECT 1 FROM friend_relationships fr
     *                         WHERE fr.user_id = posts.user_id
     *                           AND fr.friend_user_id = :viewer_id
     *                           AND fr.status = 'active'))
     *        OR (posts.visibility = 'private' AND posts.user_id = :viewer_id)
     *        OR posts.user_id = :viewer_id
     *     )
     * </pre>
     *
     * The friend_relationships subquery direction is critical:
     * fr.user_id = post author, fr.friend_user_id = viewer. Reversing leaks
     * private content. Tests in PostSpecificationsTest verify both directions.
     */
    public static Specification<Post> visibleTo(@Nullable UUID viewerId) {
        return (root, query, cb) -> {
            Predicate notDeleted = cb.isFalse(root.get("isDeleted"));
            Predicate moderationVisible = root.get("moderationStatus")
                    .in(ModerationStatus.APPROVED, ModerationStatus.FLAGGED);

            Predicate publicPost = cb.equal(root.get("visibility"), PostVisibility.PUBLIC);

            Predicate friendsPost;
            Predicate privatePost;
            Predicate ownPost;

            if (viewerId == null) {
                friendsPost = cb.disjunction();
                privatePost = cb.disjunction();
                ownPost = cb.disjunction();
            } else {
                Subquery<Integer> frSubquery = query.subquery(Integer.class);
                Root<FriendRelationship> fr = frSubquery.from(FriendRelationship.class);
                frSubquery.select(cb.literal(1)).where(
                        cb.equal(fr.get("userId"), root.get("userId")),
                        cb.equal(fr.get("friendUserId"), viewerId),
                        cb.equal(fr.get("status"), FriendRelationshipStatus.ACTIVE)
                );
                friendsPost = cb.and(
                        cb.equal(root.get("visibility"), PostVisibility.FRIENDS),
                        cb.exists(frSubquery)
                );

                privatePost = cb.and(
                        cb.equal(root.get("visibility"), PostVisibility.PRIVATE),
                        cb.equal(root.get("userId"), viewerId)
                );

                ownPost = cb.equal(root.get("userId"), viewerId);
            }

            Predicate visibilityClause = cb.or(publicPost, friendsPost, privatePost, ownPost);
            return cb.and(notDeleted, moderationVisible, visibilityClause);
        };
    }

    /**
     * Mute filter — composes WITH visibleTo() for feed and author-posts endpoints,
     * NOT for single-post detail (Spec 3.3 Divergence 1).
     *
     * Implemented as Specification subquery (NOT per-row MuteService.isMuted)
     * to fold into a single SELECT and avoid N+1.
     */
    public static Specification<Post> notMutedBy(@Nullable UUID viewerId) {
        if (viewerId == null) {
            return (root, query, cb) -> cb.conjunction();
        }
        return (root, query, cb) -> {
            Subquery<Integer> muteSubquery = query.subquery(Integer.class);
            Root<UserMute> um = muteSubquery.from(UserMute.class);
            muteSubquery.select(cb.literal(1)).where(
                    cb.equal(um.get("muterId"), viewerId),
                    cb.equal(um.get("mutedId"), root.get("userId"))
            );
            return cb.not(cb.exists(muteSubquery));
        };
    }

    public static Specification<Post> byAuthor(UUID authorUserId) {
        return (root, query, cb) -> cb.equal(root.get("userId"), authorUserId);
    }

    public static Specification<Post> byCategory(@Nullable String category) {
        if (category == null) {
            return (root, query, cb) -> cb.conjunction();
        }
        return (root, query, cb) -> cb.equal(root.get("category"), category);
    }

    public static Specification<Post> byPostType(@Nullable PostType postType) {
        if (postType == null) {
            return (root, query, cb) -> cb.conjunction();
        }
        return (root, query, cb) -> cb.equal(root.get("postType"), postType);
    }

    public static Specification<Post> byQotdId(@Nullable String qotdId) {
        if (qotdId == null) {
            return (root, query, cb) -> cb.conjunction();
        }
        return (root, query, cb) -> cb.equal(root.get("qotdId"), qotdId);
    }

    public static Specification<Post> isAnswered() {
        return (root, query, cb) -> cb.isTrue(root.get("isAnswered"));
    }

    /**
     * Spec 6.6b — excludes posts whose author has {@code isDeleted=true}
     * OR {@code isBanned=true}.
     *
     * <p>Composed ONLY into the {@code sort=answered} branch of
     * {@code PostService.listFeed} (the Answered Wall feed). Do NOT
     * generalize this into {@code visibleTo()} — that predicate is
     * load-bearing across every post feed query (main feed, profile,
     * prayer receipt, getById, etc.), and broadening its semantics
     * would cause cross-spec drift (Gate-G-EXTEND-NOT-DUPLICATE).
     *
     * <p>Implemented as a correlated subquery over {@code User} so a
     * deleted-or-banned author's already-celebrated answered post
     * disappears from the wall the moment moderation acts. Mirrors the
     * subquery JOIN style used in {@link #visibleTo(UUID)}'s FRIENDS
     * branch — keeps the query shape uniform.
     */
    public static Specification<Post> authorActive() {
        return (root, query, cb) -> {
            Subquery<Integer> sub = query.subquery(Integer.class);
            Root<User> u = sub.from(User.class);
            sub.select(cb.literal(1)).where(
                    cb.equal(u.get("id"), root.get("userId")),
                    cb.isFalse(u.get("isDeleted")),
                    cb.isFalse(u.get("isBanned"))
            );
            return cb.exists(sub);
        };
    }

    /**
     * Excludes encouragement posts older than 24 hours (Spec 4.6).
     *
     * <p>Implemented as SQL-side math (no {@code expires_at} column) per MPD-3.
     * The cutoff is computed at query time (now - 24h), so always accurate without
     * clock drift. The post stays in the DB; bookmarks and direct ID lookups
     * continue to resolve (D17). Composed at {@code listFeed()} and
     * {@code listAuthorPosts()} ONLY — never at {@code getById()}.
     *
     * <p>Predicate logic: {@code NOT (postType = ENCOURAGEMENT AND createdAt < cutoff)}.
     * Equivalent to {@code postType != ENCOURAGEMENT OR createdAt >= cutoff}.
     * Recent encouragements pass; non-encouragement posts of any age pass.
     */
    public static Specification<Post> notExpired() {
        return (root, query, cb) -> {
            OffsetDateTime cutoff = OffsetDateTime.now(ZoneOffset.UTC).minusHours(24);
            Predicate isEncouragement = cb.equal(root.get("postType"), PostType.ENCOURAGEMENT);
            Predicate isStale = cb.lessThan(root.get("createdAt"), cutoff);
            return cb.not(cb.and(isEncouragement, isStale));
        };
    }
}
