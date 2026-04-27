package com.worshiproom.friends.dto;

import java.util.UUID;

public record UserSearchResultDto(
    UUID id,
    String displayName,
    String avatarUrl
) {}
