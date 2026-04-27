package com.worshiproom.friends;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;

/**
 * Computes the start of the current week (Monday 00:00 in the given timezone)
 * to match the frontend convention from {@code frontend/src/utils/date.ts}.
 *
 * <p>Frontend logic (verbatim equivalent):
 * <pre>
 * const now = new Date();
 * const day = now.getDay(); // 0 = Sunday, 1 = Monday
 * const diff = now.getDate() - day + (day === 0 ? -6 : 1); // most-recent Monday
 * const monday = new Date(year, month, diff); // 00:00 LOCAL time
 * </pre>
 *
 * <p>Java equivalent: take "now" in the user's zone, adjust to the previous-or-
 * same Monday, set time to 00:00 in that zone, return as an OffsetDateTime
 * (with the zone's offset for that wall-time, which handles DST correctly).
 *
 * <p>DST behavior:
 * <ul>
 *   <li>Spring-forward week: {@code atStartOfDay(zone)} returns the actual
 *       earliest valid time of day in the zone (typically 00:00, but 01:00 on
 *       gap days). Friends list weekly window starts at that point — correct.</li>
 *   <li>Fall-back week: {@code atStartOfDay(zone)} returns 00:00 with the
 *       PRE-fall-back offset (the earlier of the two possible offsets), which
 *       matches the frontend's "Monday 00:00 local" framing.</li>
 * </ul>
 *
 * <p>Clock parameter is for testability — production callers pass
 * {@link Clock#systemDefaultZone()}.
 */
public final class WeekStartCalculator {

    private WeekStartCalculator() {}

    /**
     * @param zone user's IANA timezone (e.g., "America/Chicago", "UTC")
     * @param clock injected clock — production: Clock.systemDefaultZone()
     * @return Monday 00:00 in the user's timezone as an OffsetDateTime
     */
    public static OffsetDateTime monday00InZone(ZoneId zone, Clock clock) {
        LocalDate todayInZone = LocalDate.now(clock.withZone(zone));
        LocalDate monday = todayInZone.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        return monday.atStartOfDay(zone).toOffsetDateTime();
    }
}
