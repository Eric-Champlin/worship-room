package com.worshiproom.activity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * The 13 activity types tracked by the Worship Room activity engine.
 *
 * <p>Java identifiers use SCREAMING_SNAKE_CASE per Java convention; the
 * camelCase wire-format string used in JSON request bodies is mapped via
 * {@link JsonValue} (serialization) and {@link JsonCreator} (deserialization).
 * The wire strings MUST match the frontend's {@code ActivityType} union exactly
 * for Phase 2 dual-write parity (verbatim port of
 * {@code frontend/src/constants/dashboard/activity-points.ts ACTIVITY_POINTS}
 * keys).
 *
 * <p>{@code INTERCESSION} (Spec 3.6) — added when a user creates a comment on a
 * Prayer Wall post. 10 points; lower-intensity participation tier matching
 * {@code PRAY}, {@code LISTEN}, {@code DEVOTIONAL}.
 */
public enum ActivityType {
    MOOD("mood"),
    PRAY("pray"),
    LISTEN("listen"),
    PRAYER_WALL("prayerWall"),
    READING_PLAN("readingPlan"),
    MEDITATE("meditate"),
    JOURNAL("journal"),
    GRATITUDE("gratitude"),
    REFLECTION("reflection"),
    CHALLENGE("challenge"),
    LOCAL_VISIT("localVisit"),
    DEVOTIONAL("devotional"),
    INTERCESSION("intercession");

    private final String wireValue;

    ActivityType(String wireValue) {
        this.wireValue = wireValue;
    }

    @JsonValue
    public String wireValue() {
        return wireValue;
    }

    @JsonCreator
    public static ActivityType fromWireValue(String value) {
        if (value == null) {
            throw new IllegalArgumentException("ActivityType wire value must not be null");
        }
        for (ActivityType t : values()) {
            if (t.wireValue.equals(value)) {
                return t;
            }
        }
        throw new IllegalArgumentException("Unknown ActivityType wire value: " + value);
    }
}
