package com.worshiproom.presence.dto;

/**
 * Spec 6.11b — Live Presence count response payload (the {@code data} of
 * {@code GET /api/v1/prayer-wall/presence}). Contains nothing identity-bearing
 * by design.
 */
public record PresenceResponse(int count) {}
