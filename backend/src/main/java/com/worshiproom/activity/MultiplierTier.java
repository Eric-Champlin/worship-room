package com.worshiproom.activity;

/**
 * The multiplier tier applied to a day's base points.
 *
 * <p>Embedded in {@link com.worshiproom.activity.dto.FaithPointsResult}.
 * The {@code label} matches the frontend's tier label verbatim, including the
 * empty string for the base tier.
 */
public record MultiplierTier(String label, double multiplier) {}
