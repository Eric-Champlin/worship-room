package com.worshiproom.friends;

import java.time.Instant;
import java.util.UUID;

/**
 * Spring Data projection for FriendRelationshipRepository.findFriendsListForUser.
 *
 * <p>Each getter maps to an aliased column in the native query. Spring Data's
 * Projection support builds a proxy at runtime that resolves these getters
 * against the SQL ResultSet by column name.
 *
 * <p>{@link #getLastActiveAt()} returns {@link Instant} because the PostgreSQL
 * JDBC driver returns {@code TIMESTAMP WITH TIME ZONE} columns as {@code Instant}
 * via {@code ResultSet.getObject(col)}, and Spring Data's interface projection
 * has no built-in {@code Instant -> OffsetDateTime} converter. The service
 * converts to {@link java.time.OffsetDateTime} before populating the DTO.
 *
 * <p>The service maps Projection -> FriendDto, computing displayName via
 * DisplayNameResolver and levelName via LevelThresholds.
 */
public interface FriendsListProjection {

    UUID getFriendUserId();
    String getFirstName();
    String getLastName();
    String getDisplayNamePreference();
    String getCustomDisplayName();
    String getAvatarUrl();
    Instant getLastActiveAt();
    int getLevel();
    int getFaithPoints();
    int getCurrentStreak();
    int getWeeklyPoints();
}
