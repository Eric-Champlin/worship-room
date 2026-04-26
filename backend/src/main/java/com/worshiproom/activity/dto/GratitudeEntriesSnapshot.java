package com.worshiproom.activity.dto;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

/**
 * Gratitude entry dates. Mirrors the {@code date} field of each entry
 * in the frontend's {@code wr_gratitude_entries} array.
 *
 * <p>Duplicates are allowed; {@link com.worshiproom.activity.BadgeService}
 * reduces to a unique-date set for total-day counting and consecutive-streak
 * detection (Architectural Decision 9).
 *
 * @param dates unmodifiable list of dates; empty list represents "no gratitude entries yet"
 */
public record GratitudeEntriesSnapshot(List<LocalDate> dates) {

    public GratitudeEntriesSnapshot {
        dates = dates == null ? List.of() : Collections.unmodifiableList(dates);
    }

    public static GratitudeEntriesSnapshot empty() {
        return new GratitudeEntriesSnapshot(List.of());
    }
}
