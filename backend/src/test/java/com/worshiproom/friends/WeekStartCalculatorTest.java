package com.worshiproom.friends;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class WeekStartCalculatorTest {

    private static Clock fixed(String iso) {
        return Clock.fixed(Instant.parse(iso), ZoneOffset.UTC);
    }

    @Test
    void monday00InZone_utc_thursday_rollsBackToMonday() {
        // Thursday, March 12, 2026 14:00 UTC → Monday March 9, 2026 00:00 UTC
        Clock clock = fixed("2026-03-12T14:00:00Z");
        OffsetDateTime result =
            WeekStartCalculator.monday00InZone(ZoneId.of("UTC"), clock);
        assertThat(result).isEqualTo("2026-03-09T00:00:00Z");
    }

    @Test
    void monday00InZone_utc_sunday_rollsBackToPriorMonday() {
        // Sunday, March 15, 2026 23:59 UTC → Monday March 9, 2026 00:00 UTC
        // (Sunday rolls back 6 days, NOT forward 1)
        Clock clock = fixed("2026-03-15T23:59:00Z");
        OffsetDateTime result =
            WeekStartCalculator.monday00InZone(ZoneId.of("UTC"), clock);
        assertThat(result).isEqualTo("2026-03-09T00:00:00Z");
    }

    @Test
    void monday00InZone_utc_monday00_returnsSameInstant() {
        // Monday March 9 00:00 UTC → itself (previousOrSame)
        Clock clock = fixed("2026-03-09T00:00:00Z");
        OffsetDateTime result =
            WeekStartCalculator.monday00InZone(ZoneId.of("UTC"), clock);
        assertThat(result).isEqualTo("2026-03-09T00:00:00Z");
    }

    @Test
    void monday00InZone_chicagoTimezone_offsetMatchesLocalMonday() {
        // Wednesday February 11, 2026 12:00 UTC = Wednesday 06:00 CST (Chicago, UTC-6)
        // Date chosen to be clearly outside DST (US DST 2026 = Mar 8 → Nov 1) so the
        // assertion stays distinct from the spring-forward test below.
        // → Monday February 9, 2026 00:00 CST (which is 06:00 UTC)
        Clock clock = fixed("2026-02-11T12:00:00Z");
        OffsetDateTime result = WeekStartCalculator.monday00InZone(
            ZoneId.of("America/Chicago"), clock);
        // Monday Feb 9 00:00 in Chicago. CST is UTC-6, so the OffsetDateTime
        // has offset -06:00 and wall-time 2026-02-09T00:00.
        assertThat(result.toString()).startsWith("2026-02-09T00:00");
        assertThat(result.getOffset()).isEqualTo(ZoneOffset.ofHours(-6));
    }

    @Test
    void monday00InZone_dstSpringForward_handlesCorrectly() {
        // US DST 2026 starts Sunday March 8, 2026 at 02:00 local (clocks jump to 03:00).
        // Test point: Tuesday March 10, 2026 12:00 UTC (during week containing the gap).
        // Most-recent Monday in Chicago = March 9, 2026 00:00 (after spring-forward).
        // March 9 in Chicago is on CDT (UTC-5).
        Clock clock = fixed("2026-03-10T12:00:00Z");
        OffsetDateTime result = WeekStartCalculator.monday00InZone(
            ZoneId.of("America/Chicago"), clock);
        assertThat(result.toString()).startsWith("2026-03-09T00:00");
        assertThat(result.getOffset()).isEqualTo(ZoneOffset.ofHours(-5)); // CDT
    }

    @Test
    void monday00InZone_dstFallBack_handlesCorrectly() {
        // US DST 2026 ends Sunday November 1, 2026 at 02:00 local (clocks fall back to 01:00).
        // Test point: Tuesday November 3, 2026 12:00 UTC.
        // Most-recent Monday in Chicago = November 2, 2026 00:00 (after fall-back, on CST).
        Clock clock = fixed("2026-11-03T12:00:00Z");
        OffsetDateTime result = WeekStartCalculator.monday00InZone(
            ZoneId.of("America/Chicago"), clock);
        assertThat(result.toString()).startsWith("2026-11-02T00:00");
        assertThat(result.getOffset()).isEqualTo(ZoneOffset.ofHours(-6)); // CST
    }

    @Test
    void monday00InZone_tokyo_nonZeroOffset_correctlyComputed() {
        // Wednesday March 11, 2026 02:00 UTC = Wednesday 11:00 JST (Tokyo, UTC+9)
        // → Monday March 9, 2026 00:00 JST (= Sunday March 8, 15:00 UTC)
        Clock clock = fixed("2026-03-11T02:00:00Z");
        OffsetDateTime result = WeekStartCalculator.monday00InZone(
            ZoneId.of("Asia/Tokyo"), clock);
        assertThat(result.toString()).startsWith("2026-03-09T00:00");
        assertThat(result.getOffset()).isEqualTo(ZoneOffset.ofHours(9));
    }
}
