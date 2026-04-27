package com.worshiproom.friends.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record FriendRequestDto(
    UUID id,
    UUID fromUserId,
    UUID toUserId,
    String otherPartyDisplayName,
    String otherPartyAvatarUrl,
    String message,
    String status,
    OffsetDateTime createdAt,
    OffsetDateTime respondedAt
) {}
