package com.worshiproom.quicklift.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record QuickLiftStartRequest(@NotNull UUID postId) {}
