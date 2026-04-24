package com.worshiproom.auth.dto;

public record AuthResponse(String token, UserSummary user) {}
