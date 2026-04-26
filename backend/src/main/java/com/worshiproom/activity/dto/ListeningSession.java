package com.worshiproom.activity.dto;

import java.time.LocalDateTime;

/**
 * One listening history entry. Mirrors the {@code durationSeconds} field
 * of each entry in the frontend's {@code wr_listening_history} array.
 *
 * <p>{@link com.worshiproom.activity.BadgeService} sums {@code durationSeconds}
 * across all sessions to drive the {@code listen_10_hours} badge (36000-second
 * threshold).
 *
 * @param occurredAt      when the session ran
 * @param durationSeconds session length in seconds
 */
public record ListeningSession(LocalDateTime occurredAt, int durationSeconds) {}
