package com.worshiproom.user.dto;

import com.worshiproom.user.DisplayNameResolver;
import com.worshiproom.user.User;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Full user profile shape returned by GET and PATCH /api/v1/users/me.
 * Distinct from {@link com.worshiproom.auth.dto.UserSummary} — UserSummary
 * is the minimal projection embedded in /auth/login responses; UserResponse
 * is the full profile for /users/me, /u/:username (Phase 8), and Settings.
 *
 * displayName is server-computed via {@link DisplayNameResolver} so the
 * frontend never re-implements the preference-resolution rules.
 *
 * displayNamePreference is serialized as the lowercase snake_case wire form
 * ("first_only", "first_last_initial", "first_last", "custom") to match the
 * database CHECK constraint and DisplayNamePreferenceConverter output.
 */
public record UserResponse(
    UUID id,
    String email,
    String displayName,
    String firstName,
    String lastName,
    String displayNamePreference,
    String customDisplayName,
    String avatarUrl,
    String bio,
    String favoriteVerseReference,
    String favoriteVerseText,
    String timezone,
    boolean isAdmin,
    boolean isEmailVerified,
    OffsetDateTime joinedAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
            user.getId(),
            user.getEmail(),
            DisplayNameResolver.resolve(user),
            user.getFirstName(),
            user.getLastName(),
            user.getDisplayNamePreference().dbValue(),
            user.getCustomDisplayName(),
            user.getAvatarUrl(),
            user.getBio(),
            user.getFavoriteVerseReference(),
            user.getFavoriteVerseText(),
            user.getTimezone(),
            user.isAdmin(),
            user.isEmailVerified(),
            user.getJoinedAt()
        );
    }
}
