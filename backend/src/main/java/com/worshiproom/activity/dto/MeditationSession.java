package com.worshiproom.activity.dto;

import java.time.LocalDateTime;

/**
 * One meditation history entry. Mirrors an entry of the frontend's
 * {@code wr_meditation_history} array.
 *
 * <p>Only the count of sessions matters for eligibility (per Spec 2.4
 * recon B.9), but the timestamp and duration are carried so the same
 * snapshot can drive future activity-engine specs without a re-port.
 *
 * @param occurredAt      when the session ran
 * @param durationSeconds session length in seconds
 */
public record MeditationSession(LocalDateTime occurredAt, int durationSeconds) {}
