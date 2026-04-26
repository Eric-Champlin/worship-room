package com.worshiproom.activity;

import com.worshiproom.activity.dto.FaithPointsResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import java.util.EnumSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FaithPointsServiceTest {

    private final FaithPointsService service = new FaithPointsService();

    // --- Group A: Single-activity point values (12 tests) -------------------

    @Nested
    @DisplayName("A) Single-activity base point values")
    class SingleActivityPointValues {

        @Test
        void mood_aloneIs5Points() {
            FaithPointsResult result = service.calculate(EnumSet.of(ActivityType.MOOD), 0);
            assertThat(result.basePoints()).isEqualTo(5);
            assertThat(result.pointsEarned()).isEqualTo(5);
            assertThat(result.activityCount()).isEqualTo(1);
            assertThat(result.multiplierTier().multiplier()).isEqualTo(1.0);
            assertThat(result.multiplierTier().label()).isEmpty();
        }

        @Test
        void pray_aloneIs10Points() {
            FaithPointsResult result = service.calculate(EnumSet.of(ActivityType.PRAY), 0);
            assertThat(result.basePoints()).isEqualTo(10);
            assertThat(result.pointsEarned()).isEqualTo(10);
            assertThat(result.activityCount()).isEqualTo(1);
            assertThat(result.multiplierTier().multiplier()).isEqualTo(1.0);
            assertThat(result.multiplierTier().label()).isEmpty();
        }

        @Test
        void listen_aloneIs10Points() {
            FaithPointsResult result = service.calculate(EnumSet.of(ActivityType.LISTEN), 0);
            assertThat(result.basePoints()).isEqualTo(10);
            assertThat(result.pointsEarned()).isEqualTo(10);
            assertThat(result.activityCount()).isEqualTo(1);
            assertThat(result.multiplierTier().multiplier()).isEqualTo(1.0);
            assertThat(result.multiplierTier().label()).isEmpty();
        }

        @Test
        void prayerWall_aloneIs15Points() {
            FaithPointsResult result = service.calculate(EnumSet.of(ActivityType.PRAYER_WALL), 0);
            assertThat(result.basePoints()).isEqualTo(15);
            assertThat(result.pointsEarned()).isEqualTo(15);
            assertThat(result.activityCount()).isEqualTo(1);
            assertThat(result.multiplierTier().multiplier()).isEqualTo(1.0);
            assertThat(result.multiplierTier().label()).isEmpty();
        }

        @Test
        void readingPlan_aloneIs15Points() {
            FaithPointsResult result = service.calculate(EnumSet.of(ActivityType.READING_PLAN), 0);
            assertThat(result.basePoints()).isEqualTo(15);
            assertThat(result.pointsEarned()).isEqualTo(15);
            assertThat(result.activityCount()).isEqualTo(1);
            assertThat(result.multiplierTier().multiplier()).isEqualTo(1.0);
            assertThat(result.multiplierTier().label()).isEmpty();
        }

        @Test
        void meditate_aloneIs20Points() {
            FaithPointsResult result = service.calculate(EnumSet.of(ActivityType.MEDITATE), 0);
            assertThat(result.basePoints()).isEqualTo(20);
            assertThat(result.pointsEarned()).isEqualTo(20);
            assertThat(result.activityCount()).isEqualTo(1);
            assertThat(result.multiplierTier().multiplier()).isEqualTo(1.0);
            assertThat(result.multiplierTier().label()).isEmpty();
        }

        @Test
        void journal_aloneIs25Points() {
            FaithPointsResult result = service.calculate(EnumSet.of(ActivityType.JOURNAL), 0);
            assertThat(result.basePoints()).isEqualTo(25);
            assertThat(result.pointsEarned()).isEqualTo(25);
            assertThat(result.activityCount()).isEqualTo(1);
            assertThat(result.multiplierTier().multiplier()).isEqualTo(1.0);
            assertThat(result.multiplierTier().label()).isEmpty();
        }

        @Test
        void gratitude_aloneIs5Points() {
            FaithPointsResult result = service.calculate(EnumSet.of(ActivityType.GRATITUDE), 0);
            assertThat(result.basePoints()).isEqualTo(5);
            assertThat(result.pointsEarned()).isEqualTo(5);
            assertThat(result.activityCount()).isEqualTo(1);
            assertThat(result.multiplierTier().multiplier()).isEqualTo(1.0);
            assertThat(result.multiplierTier().label()).isEmpty();
        }

        @Test
        void reflection_aloneIs10Points() {
            FaithPointsResult result = service.calculate(EnumSet.of(ActivityType.REFLECTION), 0);
            assertThat(result.basePoints()).isEqualTo(10);
            assertThat(result.pointsEarned()).isEqualTo(10);
            assertThat(result.activityCount()).isEqualTo(1);
            assertThat(result.multiplierTier().multiplier()).isEqualTo(1.0);
            assertThat(result.multiplierTier().label()).isEmpty();
        }

        @Test
        void challenge_aloneIs20Points() {
            FaithPointsResult result = service.calculate(EnumSet.of(ActivityType.CHALLENGE), 0);
            assertThat(result.basePoints()).isEqualTo(20);
            assertThat(result.pointsEarned()).isEqualTo(20);
            assertThat(result.activityCount()).isEqualTo(1);
            assertThat(result.multiplierTier().multiplier()).isEqualTo(1.0);
            assertThat(result.multiplierTier().label()).isEmpty();
        }

        @Test
        void localVisit_aloneIs10Points() {
            FaithPointsResult result = service.calculate(EnumSet.of(ActivityType.LOCAL_VISIT), 0);
            assertThat(result.basePoints()).isEqualTo(10);
            assertThat(result.pointsEarned()).isEqualTo(10);
            assertThat(result.activityCount()).isEqualTo(1);
            assertThat(result.multiplierTier().multiplier()).isEqualTo(1.0);
            assertThat(result.multiplierTier().label()).isEmpty();
        }

        @Test
        void devotional_aloneIs10Points() {
            FaithPointsResult result = service.calculate(EnumSet.of(ActivityType.DEVOTIONAL), 0);
            assertThat(result.basePoints()).isEqualTo(10);
            assertThat(result.pointsEarned()).isEqualTo(10);
            assertThat(result.activityCount()).isEqualTo(1);
            assertThat(result.multiplierTier().multiplier()).isEqualTo(1.0);
            assertThat(result.multiplierTier().label()).isEmpty();
        }
    }

    // --- Group B: Multiplier tier boundaries (6 tests) ----------------------

    @Nested
    @DisplayName("B) Multiplier tier boundaries")
    class MultiplierTierBoundaries {

        @Test
        void zeroActivities_yieldsBaseTierEmptyLabelZeroPoints() {
            FaithPointsResult result = service.calculate(EnumSet.noneOf(ActivityType.class), 0);
            assertThat(result.activityCount()).isZero();
            assertThat(result.basePoints()).isZero();
            assertThat(result.pointsEarned()).isZero();
            assertThat(result.multiplierTier().multiplier()).isEqualTo(1.0);
            assertThat(result.multiplierTier().label()).isEmpty();
        }

        @Test
        void oneActivity_yieldsBaseTierEmptyLabel() {
            FaithPointsResult result = service.calculate(EnumSet.of(ActivityType.MOOD), 0);
            assertThat(result.multiplierTier().label()).isEmpty();
            assertThat(result.multiplierTier().multiplier()).isEqualTo(1.0);
        }

        @Test
        void twoActivities_yieldsGrowingTierAt125x() {
            // mood (5) + gratitude (5) = 10 base, × 1.25 = 12.5 → 13 pointsEarned
            FaithPointsResult result = service.calculate(
                EnumSet.of(ActivityType.MOOD, ActivityType.GRATITUDE), 0);
            assertThat(result.activityCount()).isEqualTo(2);
            assertThat(result.basePoints()).isEqualTo(10);
            assertThat(result.multiplierTier().multiplier()).isEqualTo(1.25);
            assertThat(result.multiplierTier().label()).isEqualTo("Growing");
            assertThat(result.pointsEarned()).isEqualTo(13);
        }

        @Test
        void fourActivities_yieldsDevotedTierAt15x() {
            // mood (5) + pray (10) + listen (10) + gratitude (5) = 30 base × 1.5 = 45
            FaithPointsResult result = service.calculate(EnumSet.of(
                ActivityType.MOOD, ActivityType.PRAY,
                ActivityType.LISTEN, ActivityType.GRATITUDE), 0);
            assertThat(result.activityCount()).isEqualTo(4);
            assertThat(result.basePoints()).isEqualTo(30);
            assertThat(result.multiplierTier().multiplier()).isEqualTo(1.5);
            assertThat(result.multiplierTier().label()).isEqualTo("Devoted");
            assertThat(result.pointsEarned()).isEqualTo(45);
        }

        @Test
        void sevenActivities_yieldsFullWorshipDayAt2x() {
            // mood(5)+pray(10)+listen(10)+prayerWall(15)+readingPlan(15)+meditate(20)+journal(25)
            // = 100 base × 2.0 = 200
            FaithPointsResult result = service.calculate(EnumSet.of(
                ActivityType.MOOD, ActivityType.PRAY, ActivityType.LISTEN,
                ActivityType.PRAYER_WALL, ActivityType.READING_PLAN,
                ActivityType.MEDITATE, ActivityType.JOURNAL), 0);
            assertThat(result.activityCount()).isEqualTo(7);
            assertThat(result.basePoints()).isEqualTo(100);
            assertThat(result.multiplierTier().multiplier()).isEqualTo(2.0);
            assertThat(result.multiplierTier().label()).isEqualTo("Full Worship Day");
            assertThat(result.pointsEarned()).isEqualTo(200);
        }

        @Test
        void allTwelveActivities_yields310Points() {
            // 5+10+10+15+15+20+25+5+10+20+10+10 = 155 base × 2.0 = 310 (matches MAX_DAILY_POINTS)
            FaithPointsResult result = service.calculate(EnumSet.allOf(ActivityType.class), 0);
            assertThat(result.activityCount()).isEqualTo(12);
            assertThat(result.basePoints()).isEqualTo(155);
            assertThat(result.multiplierTier().multiplier()).isEqualTo(2.0);
            assertThat(result.multiplierTier().label()).isEqualTo("Full Worship Day");
            assertThat(result.pointsEarned()).isEqualTo(310);
        }
    }

    // --- Group C: Level-up scenarios (7 tests) ------------------------------

    @Nested
    @DisplayName("C) Level-up scenarios")
    class LevelUpScenarios {

        @Test
        void pray10Crosses95To105_levelsUpToSprout() {
            FaithPointsResult result = service.calculate(EnumSet.of(ActivityType.PRAY), 95);
            assertThat(result.totalPoints()).isEqualTo(105);
            assertThat(result.currentLevel()).isEqualTo(2);
            assertThat(result.currentLevelName()).isEqualTo("Sprout");
            assertThat(result.levelUp()).isTrue();
        }

        @Test
        void exactBoundary95To100_levelsUp() {
            FaithPointsResult result = service.calculate(EnumSet.of(ActivityType.MOOD), 95);
            assertThat(result.totalPoints()).isEqualTo(100);
            assertThat(result.currentLevel()).isEqualTo(2);
            assertThat(result.currentLevelName()).isEqualTo("Sprout");
            assertThat(result.levelUp()).isTrue();
        }

        @Test
        void atLevelThreshold_zeroEarned_noLevelUp() {
            FaithPointsResult result = service.calculate(EnumSet.noneOf(ActivityType.class), 100);
            assertThat(result.totalPoints()).isEqualTo(100);
            assertThat(result.currentLevel()).isEqualTo(2);
            assertThat(result.currentLevelName()).isEqualTo("Sprout");
            assertThat(result.levelUp()).isFalse();
        }

        @Test
        void crossSproutToBlooming_at500() {
            FaithPointsResult result = service.calculate(EnumSet.of(ActivityType.MOOD), 495);
            assertThat(result.totalPoints()).isEqualTo(500);
            assertThat(result.currentLevel()).isEqualTo(3);
            assertThat(result.currentLevelName()).isEqualTo("Blooming");
            assertThat(result.pointsToNextLevel()).isEqualTo(1000);
            assertThat(result.levelUp()).isTrue();
        }

        @Test
        void crossBloomingToFlourishing_at1500() {
            FaithPointsResult result = service.calculate(EnumSet.of(ActivityType.MOOD), 1495);
            assertThat(result.totalPoints()).isEqualTo(1500);
            assertThat(result.currentLevel()).isEqualTo(4);
            assertThat(result.currentLevelName()).isEqualTo("Flourishing");
            assertThat(result.pointsToNextLevel()).isEqualTo(2500);
            assertThat(result.levelUp()).isTrue();
        }

        @Test
        void crossFlourishingToOak_at4000() {
            FaithPointsResult result = service.calculate(EnumSet.of(ActivityType.MOOD), 3995);
            assertThat(result.totalPoints()).isEqualTo(4000);
            assertThat(result.currentLevel()).isEqualTo(5);
            assertThat(result.currentLevelName()).isEqualTo("Oak");
            assertThat(result.pointsToNextLevel()).isEqualTo(6000);
            assertThat(result.levelUp()).isTrue();
        }

        @Test
        void crossOakToLighthouse_at10000_pointsToNextIsZero() {
            // 9999 + (5 × 1.0) = 10004
            FaithPointsResult result = service.calculate(EnumSet.of(ActivityType.MOOD), 9999);
            assertThat(result.totalPoints()).isEqualTo(10004);
            assertThat(result.currentLevel()).isEqualTo(6);
            assertThat(result.currentLevelName()).isEqualTo("Lighthouse");
            assertThat(result.pointsToNextLevel()).isZero();
            assertThat(result.levelUp()).isTrue();
        }
    }

    // --- Group D: Rounding edge cases (3 tests) -----------------------------

    @Nested
    @DisplayName("D) Rounding edge cases")
    class RoundingEdgeCases {

        @Test
        void halfValue_roundsUp_15x125Equals19() {
            // mood (5) + reflection (10) = 15 base × 1.25 = 18.75 → Math.round → 19
            FaithPointsResult result = service.calculate(
                EnumSet.of(ActivityType.MOOD, ActivityType.REFLECTION), 0);
            assertThat(result.basePoints()).isEqualTo(15);
            assertThat(result.multiplierTier().multiplier()).isEqualTo(1.25);
            assertThat(result.pointsEarned()).isEqualTo(19);
        }

        @Test
        void exactInteger_doesNotDrift_60x2Equals120() {
            // 7 cheapest distinct types: mood(5)+gratitude(5)+pray(10)+listen(10)+
            // reflection(10)+localVisit(10)+devotional(10) = 60 × 2.0 = 120 (exact int)
            FaithPointsResult result = service.calculate(EnumSet.of(
                ActivityType.MOOD, ActivityType.GRATITUDE, ActivityType.PRAY,
                ActivityType.LISTEN, ActivityType.REFLECTION,
                ActivityType.LOCAL_VISIT, ActivityType.DEVOTIONAL), 0);
            assertThat(result.activityCount()).isEqualTo(7);
            assertThat(result.basePoints()).isEqualTo(60);
            assertThat(result.multiplierTier().multiplier()).isEqualTo(2.0);
            assertThat(result.pointsEarned()).isEqualTo(120);
        }

        @Test
        void worstCase_allTwelveActivitiesEquals310() {
            FaithPointsResult result = service.calculate(EnumSet.allOf(ActivityType.class), 0);
            assertThat(result.pointsEarned()).isEqualTo(310);
        }
    }

    // --- Group E: Defensive cases (2 tests) ---------------------------------

    @Nested
    @DisplayName("E) Defensive cases")
    class DefensiveCases {

        @Test
        void emptyActivitySet_yieldsZeroPointsAtBaseTier() {
            FaithPointsResult result = service.calculate(Set.of(), 50);
            assertThat(result.basePoints()).isZero();
            assertThat(result.pointsEarned()).isZero();
            assertThat(result.activityCount()).isZero();
            assertThat(result.multiplierTier().multiplier()).isEqualTo(1.0);
            assertThat(result.multiplierTier().label()).isEmpty();
            assertThat(result.totalPoints()).isEqualTo(50);
            assertThat(result.levelUp()).isFalse();
        }

        @Test
        void negativeCurrentTotalPoints_throwsIllegalArgumentException() {
            assertThatThrownBy(() ->
                service.calculate(EnumSet.of(ActivityType.MOOD), -1))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("currentTotalPoints must be non-negative");
        }
    }
}
