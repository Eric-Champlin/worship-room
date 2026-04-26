package com.worshiproom.activity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Frontend-mirrored celebration tier (4 values, kebab-case wire strings).
 *
 * <p>Java identifiers use SCREAMING_SNAKE_CASE per Java convention; the
 * kebab-case wire-format string used in JSON request/response bodies is
 * mapped via {@link JsonValue} (serialization) and {@link JsonCreator}
 * (deserialization). The wire strings MUST match the frontend's
 * {@code CelebrationTier} union exactly (verbatim port of
 * {@code frontend/src/types/dashboard.ts CelebrationTier}).
 */
public enum CelebrationTier {
    TOAST("toast"),
    TOAST_CONFETTI("toast-confetti"),
    SPECIAL_TOAST("special-toast"),
    FULL_SCREEN("full-screen");

    private final String wireValue;

    CelebrationTier(String wireValue) {
        this.wireValue = wireValue;
    }

    @JsonValue
    public String wireValue() {
        return wireValue;
    }

    @JsonCreator
    public static CelebrationTier fromWireValue(String value) {
        if (value == null) {
            throw new IllegalArgumentException("CelebrationTier wire value must not be null");
        }
        for (CelebrationTier t : values()) {
            if (t.wireValue.equals(value)) {
                return t;
            }
        }
        throw new IllegalArgumentException("Unknown CelebrationTier wire value: " + value);
    }
}
