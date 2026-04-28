package com.worshiproom.mute.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Item shape for GET /api/v1/mutes. Computed by MuteService.listMutedUsers
 * via a single native query joining user_mutes + users. Display name
 * resolved server-side via DisplayNameResolver from the muted user's
 * preference (matching FriendDto).
 */
public record MutedUserDto(
    UUID userId,
    String displayName,
    String avatarUrl,
    OffsetDateTime mutedAt
) {}
