package com.worshiproom.activity;

import com.worshiproom.activity.dto.StreakResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StreakServiceTest {

    private final StreakService service = new StreakService();

    private static final LocalDate TODAY = LocalDate.of(2026, 4, 26);
    private static final LocalDate YESTERDAY = TODAY.minusDays(1);
    private static final LocalDate TWO_DAYS_AGO = TODAY.minusDays(2);
    private static final LocalDate ONE_WEEK_AGO = TODAY.minusDays(7);
    private static final LocalDate ONE_YEAR_AGO = TODAY.minusDays(365);

    // --- Group A: First-ever activity (3 tests) -------------------------------

    @Nested
    @DisplayName("A) updateStreak — first-ever activity")
    class FirstEverActivity {

        @Test
        void freshState_yieldsFirstEverTransitionAndStreakOfOne() {
            StreakResult result = service.updateStreak(StreakStateData.fresh(), TODAY);

            assertThat(result.transition()).isEqualTo(StreakTransition.FIRST_EVER);
            assertThat(result.newState().currentStreak()).isEqualTo(1);
            assertThat(result.newState().longestStreak()).isEqualTo(1);
            assertThat(result.newState().lastActiveDate()).isEqualTo(TODAY);
            assertThat(result.previousStreak()).isZero();
            assertThat(result.shouldCaptureForRepair()).isFalse();
        }

        @Test
        void corruptStateNonZeroStreakWithNullDate_stillTreatsAsFirstEver() {
            // Frontend null-check is positional and unconditional.
            // currentStreak=5 with null lastActiveDate is corruption; we port the behavior.
            StreakStateData corruptState = new StreakStateData(5, 7, null);
            StreakResult result = service.updateStreak(corruptState, TODAY);

            assertThat(result.transition()).isEqualTo(StreakTransition.FIRST_EVER);
            assertThat(result.newState().currentStreak()).isEqualTo(1);
            assertThat(result.newState().longestStreak()).isEqualTo(1);
            assertThat(result.previousStreak()).isEqualTo(5);
            assertThat(result.shouldCaptureForRepair()).isFalse();
        }

        @Test
        void freshState_setsLongestStreakToOne() {
            StreakResult result = service.updateStreak(StreakStateData.fresh(), TODAY);
            assertThat(result.newState().longestStreak()).isEqualTo(1);
        }
    }

    // --- Group B: Same-day repeat (3 tests) -----------------------------------

    @Nested
    @DisplayName("B) updateStreak — same-day repeat")
    class SameDayRepeat {

        @Test
        void lastActiveEqualsToday_returnsUnchangedState() {
            StreakStateData state = new StreakStateData(5, 7, TODAY);
            StreakResult result = service.updateStreak(state, TODAY);

            assertThat(result.transition()).isEqualTo(StreakTransition.SAME_DAY);
            assertThat(result.newState()).isEqualTo(state);
            assertThat(result.previousStreak()).isEqualTo(5);
            assertThat(result.shouldCaptureForRepair()).isFalse();
        }

        @Test
        void firstDayActivePlusSecondCallSameDay_unchanged() {
            // user just became active today, then calls updateStreak again same day
            StreakStateData state = new StreakStateData(1, 1, TODAY);
            StreakResult result = service.updateStreak(state, TODAY);

            assertThat(result.transition()).isEqualTo(StreakTransition.SAME_DAY);
            assertThat(result.newState().currentStreak()).isEqualTo(1);
            assertThat(result.newState().longestStreak()).isEqualTo(1);
            assertThat(result.newState().lastActiveDate()).isEqualTo(TODAY);
        }

        @Test
        void idempotency_doubleCallSameDayYieldsSameResult() {
            StreakStateData state = new StreakStateData(3, 9, TODAY);
            StreakResult first = service.updateStreak(state, TODAY);
            StreakResult second = service.updateStreak(first.newState(), TODAY);

            assertThat(second.newState()).isEqualTo(first.newState());
            assertThat(second.transition()).isEqualTo(StreakTransition.SAME_DAY);
        }
    }

    // --- Group C: Yesterday → increment (5 tests) -----------------------------

    @Nested
    @DisplayName("C) updateStreak — yesterday increments")
    class YesterdayIncrements {

        @Test
        void streakOne_becomesTwo() {
            StreakStateData state = new StreakStateData(1, 1, YESTERDAY);
            StreakResult result = service.updateStreak(state, TODAY);

            assertThat(result.transition()).isEqualTo(StreakTransition.INCREMENT);
            assertThat(result.newState().currentStreak()).isEqualTo(2);
            assertThat(result.newState().longestStreak()).isEqualTo(2);
            assertThat(result.newState().lastActiveDate()).isEqualTo(TODAY);
        }

        @Test
        void newStreakLessThanLongest_longestUnchanged() {
            // current=5 → 6, but longest=10 → stays 10
            StreakStateData state = new StreakStateData(5, 10, YESTERDAY);
            StreakResult result = service.updateStreak(state, TODAY);

            assertThat(result.transition()).isEqualTo(StreakTransition.INCREMENT);
            assertThat(result.newState().currentStreak()).isEqualTo(6);
            assertThat(result.newState().longestStreak()).isEqualTo(10);
        }

        @Test
        void newStreakMatchesAndExceedsLongest_longestUpdated() {
            // current=5, longest=5 → 6, 6
            StreakStateData state = new StreakStateData(5, 5, YESTERDAY);
            StreakResult result = service.updateStreak(state, TODAY);

            assertThat(result.transition()).isEqualTo(StreakTransition.INCREMENT);
            assertThat(result.newState().currentStreak()).isEqualTo(6);
            assertThat(result.newState().longestStreak()).isEqualTo(6);
        }

        @Test
        void streakNinetyNine_becomesOneHundred() {
            StreakStateData state = new StreakStateData(99, 99, YESTERDAY);
            StreakResult result = service.updateStreak(state, TODAY);

            assertThat(result.newState().currentStreak()).isEqualTo(100);
            assertThat(result.newState().longestStreak()).isEqualTo(100);
        }

        @Test
        void incrementInvariant_longestEqualsMaxOfNewAndOldLongest() {
            // verifies the invariant longestStreak = max(newStreak, oldLongest)
            StreakStateData state = new StreakStateData(7, 12, YESTERDAY);
            StreakResult result = service.updateStreak(state, TODAY);

            assertThat(result.newState().currentStreak()).isEqualTo(8);
            assertThat(result.newState().longestStreak()).isEqualTo(12);  // max(8, 12)
            assertThat(result.shouldCaptureForRepair()).isFalse();
        }
    }

    // --- Group D: Multi-day gap → reset (5 tests) -----------------------------

    @Nested
    @DisplayName("D) updateStreak — multi-day gap resets")
    class MultiDayGapResets {

        @Test
        void twoDayGapWithMeaningfulStreak_capturesForRepair() {
            // streak 10, longest 10, two days ago → reset to (1, 10, today), capture=true
            StreakStateData state = new StreakStateData(10, 10, TWO_DAYS_AGO);
            StreakResult result = service.updateStreak(state, TODAY);

            assertThat(result.transition()).isEqualTo(StreakTransition.RESET);
            assertThat(result.newState().currentStreak()).isEqualTo(1);
            assertThat(result.newState().longestStreak()).isEqualTo(10);
            assertThat(result.newState().lastActiveDate()).isEqualTo(TODAY);
            assertThat(result.previousStreak()).isEqualTo(10);
            assertThat(result.shouldCaptureForRepair()).isTrue();
        }

        @Test
        void oneWeekGap_capturesForRepair() {
            StreakStateData state = new StreakStateData(7, 7, ONE_WEEK_AGO);
            StreakResult result = service.updateStreak(state, TODAY);

            assertThat(result.transition()).isEqualTo(StreakTransition.RESET);
            assertThat(result.newState().currentStreak()).isEqualTo(1);
            assertThat(result.newState().longestStreak()).isEqualTo(7);
            assertThat(result.previousStreak()).isEqualTo(7);
            assertThat(result.shouldCaptureForRepair()).isTrue();
        }

        @Test
        void resetWithStreakEqualToOne_doesNotCaptureForRepair() {
            // previousStreak=1 → shouldCaptureForRepair must be false (oldStreak > 1 guard)
            StreakStateData state = new StreakStateData(1, 5, TWO_DAYS_AGO);
            StreakResult result = service.updateStreak(state, TODAY);

            assertThat(result.transition()).isEqualTo(StreakTransition.RESET);
            assertThat(result.newState().currentStreak()).isEqualTo(1);
            assertThat(result.newState().longestStreak()).isEqualTo(5);
            assertThat(result.previousStreak()).isEqualTo(1);
            assertThat(result.shouldCaptureForRepair()).isFalse();
        }

        @Test
        void resetWithZeroLongest_longestBecomesOne() {
            // (0, 0, two-days-ago) → (1, max(1, 0)=1, today), capture=false
            StreakStateData state = new StreakStateData(0, 0, TWO_DAYS_AGO);
            StreakResult result = service.updateStreak(state, TODAY);

            assertThat(result.transition()).isEqualTo(StreakTransition.RESET);
            assertThat(result.newState().currentStreak()).isEqualTo(1);
            assertThat(result.newState().longestStreak()).isEqualTo(1);
            assertThat(result.previousStreak()).isZero();
            assertThat(result.shouldCaptureForRepair()).isFalse();
        }

        @Test
        void oneYearGap_behavesIdenticallyToTwoDayGap() {
            // any gap > 1 day is RESET; 365 days is not special
            StreakStateData state = new StreakStateData(50, 50, ONE_YEAR_AGO);
            StreakResult result = service.updateStreak(state, TODAY);

            assertThat(result.transition()).isEqualTo(StreakTransition.RESET);
            assertThat(result.newState().currentStreak()).isEqualTo(1);
            assertThat(result.newState().longestStreak()).isEqualTo(50);
            assertThat(result.shouldCaptureForRepair()).isTrue();
        }
    }

    // --- Group E: Date edge cases (4 tests) -----------------------------------

    @Nested
    @DisplayName("E) updateStreak — date edge cases")
    class DateEdgeCases {

        @Test
        void monthBoundary_jan31ToFeb1_increments() {
            LocalDate today = LocalDate.of(2026, 2, 1);
            LocalDate jan31 = LocalDate.of(2026, 1, 31);
            StreakStateData state = new StreakStateData(3, 5, jan31);

            StreakResult result = service.updateStreak(state, today);

            assertThat(result.transition()).isEqualTo(StreakTransition.INCREMENT);
            assertThat(result.newState().currentStreak()).isEqualTo(4);
            assertThat(result.newState().lastActiveDate()).isEqualTo(today);
        }

        @Test
        void yearBoundary_dec31ToJan1_increments() {
            LocalDate jan1 = LocalDate.of(2026, 1, 1);
            LocalDate dec31 = LocalDate.of(2025, 12, 31);
            StreakStateData state = new StreakStateData(2, 2, dec31);

            StreakResult result = service.updateStreak(state, jan1);

            assertThat(result.transition()).isEqualTo(StreakTransition.INCREMENT);
            assertThat(result.newState().currentStreak()).isEqualTo(3);
            assertThat(result.newState().lastActiveDate()).isEqualTo(jan1);
        }

        @Test
        void leapYearBoundary_feb28ToFeb29_increments() {
            // 2024 is a leap year; 2026 is not. Use 2024 explicitly.
            LocalDate feb28 = LocalDate.of(2024, 2, 28);
            LocalDate feb29 = LocalDate.of(2024, 2, 29);
            StreakStateData state = new StreakStateData(1, 1, feb28);

            StreakResult result = service.updateStreak(state, feb29);

            assertThat(result.transition()).isEqualTo(StreakTransition.INCREMENT);
            assertThat(result.newState().currentStreak()).isEqualTo(2);
            assertThat(result.newState().lastActiveDate()).isEqualTo(feb29);
        }

        @Test
        void dstTransitionDay_localDateUnaffected_increments() {
            // US DST spring-forward: 2026-03-08 (March 8). LocalDate has no time
            // component, so DST is irrelevant — yesterday→today is still yesterday→today.
            LocalDate dstDay = LocalDate.of(2026, 3, 8);
            LocalDate dayBefore = LocalDate.of(2026, 3, 7);
            StreakStateData state = new StreakStateData(4, 4, dayBefore);

            StreakResult result = service.updateStreak(state, dstDay);

            assertThat(result.transition()).isEqualTo(StreakTransition.INCREMENT);
            assertThat(result.newState().currentStreak()).isEqualTo(5);
        }
    }

    // --- Group F: isFreeRepairAvailable (5 tests) -----------------------------

    @Nested
    @DisplayName("F) isFreeRepairAvailable — eligibility check")
    class FreeRepairEligibility {

        // Use a known Monday for currentWeekStart. 2026-04-20 is a Monday.
        private final LocalDate currentWeekStart = LocalDate.of(2026, 4, 20);

        @Test
        void neverUsed_isAvailable() {
            assertThat(service.isFreeRepairAvailable(null, currentWeekStart)).isTrue();
        }

        @Test
        void usedOneDayBeforeWeekStart_isAvailable() {
            LocalDate yesterday = currentWeekStart.minusDays(1);  // Sunday before
            assertThat(service.isFreeRepairAvailable(yesterday, currentWeekStart)).isTrue();
        }

        @Test
        void usedOnWeekStartItself_isNotAvailable() {
            // strictly less-than: equality means "this week", not available
            assertThat(service.isFreeRepairAvailable(currentWeekStart, currentWeekStart)).isFalse();
        }

        @Test
        void usedOneDayAfterWeekStart_isNotAvailable() {
            LocalDate tuesday = currentWeekStart.plusDays(1);
            assertThat(service.isFreeRepairAvailable(tuesday, currentWeekStart)).isFalse();
        }

        @Test
        void usedExactlyOneWeekBefore_isAvailable() {
            // previous Monday → strictly less than this Monday → available
            LocalDate previousMonday = currentWeekStart.minusDays(7);
            assertThat(service.isFreeRepairAvailable(previousMonday, currentWeekStart)).isTrue();
        }
    }

    // --- Group G: Defensive null checks (3 tests, bonus beyond the 25 minimum) -

    @Nested
    @DisplayName("G) Defensive cases")
    class DefensiveCases {

        @Test
        void updateStreak_nullCurrentState_throwsIllegalArgumentException() {
            assertThatThrownBy(() -> service.updateStreak(null, TODAY))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("currentState must not be null");
        }

        @Test
        void updateStreak_nullToday_throwsIllegalArgumentException() {
            assertThatThrownBy(() -> service.updateStreak(StreakStateData.fresh(), null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("today must not be null");
        }

        @Test
        void isFreeRepairAvailable_nullCurrentWeekStart_throwsIllegalArgumentException() {
            assertThatThrownBy(() -> service.isFreeRepairAvailable(LocalDate.of(2026, 4, 1), null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("currentWeekStart must not be null");
        }
    }
}
