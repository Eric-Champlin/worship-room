package com.worshiproom.activity.dto;

/**
 * Local-support visits aggregate. Mirrors {@code getUniqueVisitedPlaces().total}
 * in the frontend.
 *
 * @param totalUniqueVisits non-negative count of unique places visited
 */
public record LocalVisitsSnapshot(int totalUniqueVisits) {

    public static LocalVisitsSnapshot zero() {
        return new LocalVisitsSnapshot(0);
    }
}
