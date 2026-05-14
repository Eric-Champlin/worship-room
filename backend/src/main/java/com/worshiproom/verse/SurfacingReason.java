package com.worshiproom.verse;

/**
 * The four explicit reasons a Verse-Finds-You call can return {@code verse: null}
 * (Spec 6.8 §"Selection algorithm" + Gate-G-SILENT-FAILURE).
 *
 * <p>Each value serializes as lowercase to match the API spec response shape.
 */
public enum SurfacingReason {
    COOLDOWN,
    CRISIS_SUPPRESSION,
    DISABLED,
    NO_MATCH
}
