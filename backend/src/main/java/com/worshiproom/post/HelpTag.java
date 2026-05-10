package com.worshiproom.post;

import java.util.Arrays;
import java.util.Comparator;

/**
 * Spec 4.7b — Practical-help tags an author can mark on a prayer_request
 * post. Wire format is lowercase snake_case; {@link #wireValue()} returns
 * the canonical string. Declaration order is the canonical sort order
 * (see {@link #CANONICAL_ORDER}).
 */
public enum HelpTag {
    MEALS("meals"),
    RIDES("rides"),
    ERRANDS("errands"),
    VISITS("visits"),
    JUST_PRAYER("just_prayer");

    private final String wireValue;

    HelpTag(String wireValue) { this.wireValue = wireValue; }

    public String wireValue() { return wireValue; }

    /**
     * Parse a wire-value string into the enum, throwing
     * {@link InvalidHelpTagException} on unknown / null / empty values.
     * Case-sensitive (e.g., "MEALS" rejects).
     */
    public static HelpTag fromWireValue(String raw) {
        if (raw == null) throw new InvalidHelpTagException("null");
        if (raw.isEmpty()) throw new InvalidHelpTagException("");
        return Arrays.stream(values())
                .filter(t -> t.wireValue.equals(raw))
                .findFirst()
                .orElseThrow(() -> new InvalidHelpTagException(raw));
    }

    /** Canonical declaration order is the canonical sort order (D3). */
    public static final Comparator<HelpTag> CANONICAL_ORDER =
            Comparator.comparingInt(HelpTag::ordinal);
}
