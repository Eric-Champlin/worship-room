package com.worshiproom.auth.dto;

import java.util.UUID;

public record UserSummary(
    UUID id,
    String email,
    String displayName,
    String firstName,
    String lastName,
    boolean isAdmin,
    String timezone
) {}
