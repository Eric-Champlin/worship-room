package com.worshiproom.mute;

import java.time.Instant;
import java.util.UUID;

/**
 * Spring Data projection for UserMuteRepository.findMutedUsersForMuter.
 *
 * <p>Each getter maps to an aliased column in the native query. Spring Data's
 * Projection support builds a proxy at runtime that resolves these getters
 * against the SQL ResultSet by column name.
 *
 * <p>{@link #getMutedAt()} returns {@link Instant} because the PostgreSQL
 * JDBC driver returns {@code TIMESTAMP WITH TIME ZONE} columns as
 * {@code Instant} via {@code ResultSet.getObject(col)}, and Spring Data's
 * interface projection has no built-in {@code Instant -> OffsetDateTime}
 * converter. The service converts to {@link java.time.OffsetDateTime}
 * before populating the DTO. Same shape as
 * {@link com.worshiproom.friends.FriendsListProjection#getLastActiveAt()}.
 */
public interface MutedUserProjection {
    UUID getMutedUserId();
    String getFirstName();
    String getLastName();
    String getDisplayNamePreference();
    String getCustomDisplayName();
    String getAvatarUrl();
    Instant getMutedAt();
}
