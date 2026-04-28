package com.worshiproom.mute;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserMuteRepository extends JpaRepository<UserMute, UserMuteId> {

    /**
     * List all mutes by a given muter, joined with the users table to surface
     * displayName + avatarUrl. Ordered by created_at DESC (most recent first).
     * Includes deleted/banned target users so the muter can still see and
     * unmute them — defensive default per Spec 2.5.7.
     *
     * <p>Native query for the join + ORDER BY pattern (same approach as
     * {@link com.worshiproom.friends.FriendRelationshipRepository#findFriendsListForUser}).
     * Uses an interface projection so the result rows map directly to
     * {@link MutedUserProjection} without a manual RowMapper.
     */
    @Query(value = """
        SELECT
            u.id                       AS muted_user_id,
            u.first_name               AS first_name,
            u.last_name                AS last_name,
            u.display_name_preference  AS display_name_preference,
            u.custom_display_name      AS custom_display_name,
            u.avatar_url               AS avatar_url,
            um.created_at              AS muted_at
        FROM user_mutes um
            JOIN users u ON u.id = um.muted_id
        WHERE um.muter_id = :muterId
        ORDER BY um.created_at DESC
        """,
        nativeQuery = true)
    List<MutedUserProjection> findMutedUsersForMuter(@Param("muterId") UUID muterId);
}
