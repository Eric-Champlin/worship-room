package com.worshiproom.friends.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record FriendDto(
    UUID id,
    String displayName,
    String avatarUrl,
    int level,
    String levelName,
    int currentStreak,
    int faithPoints,
    int weeklyPoints,
    OffsetDateTime lastActive
) {}
