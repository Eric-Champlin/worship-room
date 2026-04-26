package com.worshiproom.activity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Optional;

/**
 * The 14 count types tracked by the Worship Room activity engine.
 *
 * <p>Java identifiers use SCREAMING_SNAKE_CASE per Java convention; the
 * camelCase wire-format string used in JSON request/response bodies and
 * stored in the {@code activity_counts.count_type} column is mapped via
 * {@link JsonValue} (serialization) and {@link JsonCreator} (deserialization).
 * The wire strings MUST match the frontend's {@code ActivityCounts} interface
 * field names exactly (verbatim port of the 14 fields in
 * {@code frontend/src/types/dashboard.ts}).
 *
 * <p>Distinct from {@link ActivityType} (12 values, partial overlap):
 * {@code ActivityType} describes what the user did; {@code CountType}
 * describes what counter accumulates. The {@code activity_type → count_type}
 * mapping lives at the call site in Spec 2.6's controller, not here.
 *
 * <p>Per Spec 2.5 Architectural Decision #4, {@link #fromWireValue} returns
 * {@link Optional} rather than throwing on unknown values. This is a
 * deliberate divergence from {@link ActivityType#fromWireValue} —
 * {@code getAllCounts} reads rows from the DB and must be resilient to
 * rogue strings (a future spec adds a new count type; the row exists in
 * the DB but the deployed JVM doesn't know it yet). The unknown row is
 * skipped with a warning rather than poisoning the whole map.
 */
public enum CountType {
    PRAY("pray"),
    JOURNAL("journal"),
    MEDITATE("meditate"),
    LISTEN("listen"),
    PRAYER_WALL("prayerWall"),
    READING_PLAN("readingPlan"),
    GRATITUDE("gratitude"),
    REFLECTION("reflection"),
    ENCOURAGEMENTS_SENT("encouragementsSent"),
    FULL_WORSHIP_DAYS("fullWorshipDays"),
    CHALLENGES_COMPLETED("challengesCompleted"),
    INTERCESSION_COUNT("intercessionCount"),
    BIBLE_CHAPTERS_READ("bibleChaptersRead"),
    PRAYER_WALL_POSTS("prayerWallPosts");

    private final String wireValue;

    CountType(String wireValue) {
        this.wireValue = wireValue;
    }

    @JsonValue
    public String wireValue() {
        return wireValue;
    }

    /**
     * Resilient lookup: returns {@link Optional#empty()} for unknown wire values
     * rather than throwing. See class JavaDoc and Spec 2.5 Architectural
     * Decision #4 for rationale.
     *
     * <p>{@link JsonCreator} is intentionally NOT applied here — Jackson would
     * call this with arbitrary input strings during deserialization, and an
     * empty Optional would silently null out the deserialized field. If
     * Jackson deserialization of {@code CountType} is ever needed, add a
     * separate {@code @JsonCreator}-tagged factory that throws on unknown.
     */
    public static Optional<CountType> fromWireValue(String value) {
        if (value == null) {
            return Optional.empty();
        }
        for (CountType t : values()) {
            if (t.wireValue.equals(value)) {
                return Optional.of(t);
            }
        }
        return Optional.empty();
    }
}
