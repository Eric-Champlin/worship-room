package com.worshiproom.friends;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FriendRelationshipRepository
        extends JpaRepository<FriendRelationship, FriendRelationshipId> {

    List<FriendRelationship> findAllByUserIdAndStatus(UUID userId, FriendRelationshipStatus status);

    Optional<FriendRelationship> findByUserIdAndFriendUserId(UUID userId, UUID friendUserId);

    boolean existsByUserIdAndFriendUserIdAndStatus(
        UUID userId, UUID friendUserId, FriendRelationshipStatus status);

    /**
     * True when EITHER (a -> b) OR (b -> a) has status = BLOCKED. Used to gate
     * sendRequest and acceptRequest. JPQL because the comparison fits.
     */
    @Query("""
        SELECT COUNT(fr) > 0 FROM FriendRelationship fr
        WHERE ((fr.userId = :a AND fr.friendUserId = :b)
            OR (fr.userId = :b AND fr.friendUserId = :a))
          AND fr.status = com.worshiproom.friends.FriendRelationshipStatus.BLOCKED
        """)
    boolean isEitherDirectionBlocked(@Param("a") UUID a, @Param("b") UUID b);

    /**
     * Bulk delete the ACTIVE rows in both directions of a friendship in one
     * statement. Used by {@code removeFriend} (tears down a confirmed friendship)
     * and as the cleanup step in {@code blockUser} (breaks the friendship before
     * adding the block).
     *
     * <p>The {@code status='active'} filter is load-bearing: an unfiltered
     * either-direction delete would silently destroy a pre-existing block row
     * in the reverse direction (e.g., when A is about to block B but B has
     * already blocked A — B's block must remain intact). Callers that want to
     * remove a single block row should use
     * {@link #deleteByUserIdAndFriendUserIdAndStatus} instead.
     *
     * <p>Returns the number of rows deleted (0, 1, or 2).
     */
    @Modifying
    @Query("""
        DELETE FROM FriendRelationship fr
        WHERE ((fr.userId = :a AND fr.friendUserId = :b)
            OR (fr.userId = :b AND fr.friendUserId = :a))
          AND fr.status = com.worshiproom.friends.FriendRelationshipStatus.ACTIVE
        """)
    int deleteActiveBothDirections(@Param("a") UUID a, @Param("b") UUID b);

    /**
     * Bulk delete a single row identified by composite PK plus a status guard.
     * Used by {@code unblockUser} to remove exactly the {@code (blocker → blocked, BLOCKED)}
     * row without touching any reverse-direction block the other party may have
     * placed independently.
     *
     * <p>Returns the number of rows deleted (0 or 1).
     */
    @Modifying
    @Query("""
        DELETE FROM FriendRelationship fr
        WHERE fr.userId = :userId
          AND fr.friendUserId = :friendUserId
          AND fr.status = :status
        """)
    int deleteByUserIdAndFriendUserIdAndStatus(
        @Param("userId") UUID userId,
        @Param("friendUserId") UUID friendUserId,
        @Param("status") FriendRelationshipStatus status);

    /**
     * Denormalized friends-list query (Decision 8 mandate).
     *
     * <p>Single SQL execution returns one row per ACTIVE friend with all
     * fields the FriendDto needs. The COALESCE clauses provide defaults
     * for users with no faith_points row, no streak_state row, or no
     * activity_log rows in the current week.
     *
     * <p>Filters: ACTIVE status only, friend not deleted, friend not banned.
     * Order: most-recently-active first (NULLS LAST), then alphabetical
     * by first name as a tiebreak.
     *
     * <p>Native query because the windowed SUM subquery on activity_log
     * is awkward to express in JPQL. Parameter binding is parameterized.
     */
    @Query(value = """
        SELECT
            u.id                       AS friend_user_id,
            u.first_name               AS first_name,
            u.last_name                AS last_name,
            u.display_name_preference  AS display_name_preference,
            u.custom_display_name      AS custom_display_name,
            u.avatar_url               AS avatar_url,
            u.last_active_at           AS last_active_at,
            COALESCE(fp.current_level, 1)  AS level,
            COALESCE(fp.total_points, 0)   AS faith_points,
            COALESCE(ss.current_streak, 0) AS current_streak,
            COALESCE((
                SELECT SUM(al.points_earned)
                FROM activity_log al
                WHERE al.user_id = u.id
                  AND al.occurred_at >= :weekStart
            ), 0) AS weekly_points
        FROM friend_relationships fr
            JOIN users u ON u.id = fr.friend_user_id
            LEFT JOIN faith_points fp ON fp.user_id = u.id
            LEFT JOIN streak_state ss ON ss.user_id = u.id
        WHERE fr.user_id = :userId
          AND fr.status = 'active'
          AND u.is_deleted = FALSE
          AND u.is_banned = FALSE
        ORDER BY u.last_active_at DESC NULLS LAST, u.first_name ASC
        """,
        nativeQuery = true)
    List<FriendsListProjection> findFriendsListForUser(
        @Param("userId") UUID userId,
        @Param("weekStart") OffsetDateTime weekStart);

    /**
     * Search users by name prefix, excluding the caller, blocked-by-caller,
     * blocked-the-caller, deleted, and banned users.
     *
     * <p>JPQL with LIKE concatenation via parameter binding (no SQL injection
     * vector). Limit is applied via Pageable.
     */
    @Query("""
        SELECT u FROM com.worshiproom.user.User u
        WHERE u.id <> :actingUserId
          AND u.isDeleted = FALSE
          AND u.isBanned = FALSE
          AND (LOWER(u.firstName) LIKE LOWER(CONCAT(:q, '%'))
            OR LOWER(u.lastName) LIKE LOWER(CONCAT(:q, '%')))
          AND NOT EXISTS (
              SELECT 1 FROM FriendRelationship fr
              WHERE fr.userId = :actingUserId
                AND fr.friendUserId = u.id
                AND fr.status = com.worshiproom.friends.FriendRelationshipStatus.BLOCKED)
          AND NOT EXISTS (
              SELECT 1 FROM FriendRelationship fr
              WHERE fr.userId = u.id
                AND fr.friendUserId = :actingUserId
                AND fr.status = com.worshiproom.friends.FriendRelationshipStatus.BLOCKED)
        ORDER BY u.firstName ASC
        """)
    List<com.worshiproom.user.User> searchUsersExcludingBlocks(
        @Param("actingUserId") UUID actingUserId,
        @Param("q") String q,
        Pageable pageable);
}
