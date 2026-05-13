package com.worshiproom.quicklift.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record QuickLiftStartResponse(UUID sessionId, OffsetDateTime serverStartedAt) {}
