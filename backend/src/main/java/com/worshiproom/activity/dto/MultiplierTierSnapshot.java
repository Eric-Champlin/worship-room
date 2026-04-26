package com.worshiproom.activity.dto;

/**
 * Multiplier tier currently applied to the user's daily activity set.
 *
 * <p>On the first-time-today path, reflects today's set AFTER this call.
 * On the record-only path, reflects the pre-existing today's set
 * (the duplicate activity does not change the set size).
 *
 * <p>{@code label} is empty for the base tier (1.0×); other values are
 * {@code "Growing"} (1.25×), {@code "Devoted"} (1.5×),
 * {@code "Full Worship Day"} (2.0×).
 */
public record MultiplierTierSnapshot(
    String label,
    double multiplier
) {}
