package com.worshiproom.activity;

import com.worshiproom.activity.dto.ActivityCountsSnapshot;
import com.worshiproom.activity.dto.BadgeResult;
import com.worshiproom.activity.dto.BibleProgressSnapshot;
import com.worshiproom.activity.dto.GratitudeEntriesSnapshot;
import com.worshiproom.activity.dto.ListeningSession;
import com.worshiproom.activity.dto.LocalVisitsSnapshot;
import com.worshiproom.activity.dto.MeditationSession;
import com.worshiproom.activity.dto.ReadingPlanProgress;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BadgeServiceTest {

    private final BadgeService service = new BadgeService();

    // === Helpers ===

    /**
     * Build a "zero" context: streak 0, level 1, no activities, all empty
     * collections. Tests override individual fields by reconstructing.
     */
    private BadgeCheckContext zeroContext() {
        return new BadgeCheckContext(
            0, 0, 1, 1,
            EnumSet.noneOf(ActivityType.class),
            ActivityCountsSnapshot.zeros(),
            0,
            false,
            List.of(),
            BibleProgressSnapshot.empty(),
            List.of(),
            GratitudeEntriesSnapshot.empty(),
            LocalVisitsSnapshot.zero(),
            List.of()
        );
    }

    private BadgeCheckContext withStreak(int streak) {
        BadgeCheckContext base = zeroContext();
        return new BadgeCheckContext(
            streak, base.longestStreak(), base.currentLevel(), base.previousLevel(),
            base.todayActivities(), base.activityCounts(), base.friendCount(),
            base.allActivitiesWereTrueBefore(), base.readingPlanProgress(),
            base.bibleProgress(), base.meditationHistory(), base.gratitudeEntries(),
            base.localVisits(), base.listeningHistory()
        );
    }

    private BadgeCheckContext withLevel(int level) {
        BadgeCheckContext base = zeroContext();
        return new BadgeCheckContext(
            base.currentStreak(), base.longestStreak(), level, base.previousLevel(),
            base.todayActivities(), base.activityCounts(), base.friendCount(),
            base.allActivitiesWereTrueBefore(), base.readingPlanProgress(),
            base.bibleProgress(), base.meditationHistory(), base.gratitudeEntries(),
            base.localVisits(), base.listeningHistory()
        );
    }

    private BadgeCheckContext withCounts(ActivityCountsSnapshot counts) {
        BadgeCheckContext base = zeroContext();
        return new BadgeCheckContext(
            base.currentStreak(), base.longestStreak(), base.currentLevel(), base.previousLevel(),
            base.todayActivities(), counts, base.friendCount(),
            base.allActivitiesWereTrueBefore(), base.readingPlanProgress(),
            base.bibleProgress(), base.meditationHistory(), base.gratitudeEntries(),
            base.localVisits(), base.listeningHistory()
        );
    }

    private BadgeCheckContext withTodayActivities(Set<ActivityType> today, boolean alreadyTrueBefore,
                                                  List<ReadingPlanProgress> plans) {
        BadgeCheckContext base = zeroContext();
        return new BadgeCheckContext(
            base.currentStreak(), base.longestStreak(), base.currentLevel(), base.previousLevel(),
            today, base.activityCounts(), base.friendCount(),
            alreadyTrueBefore, plans,
            base.bibleProgress(), base.meditationHistory(), base.gratitudeEntries(),
            base.localVisits(), base.listeningHistory()
        );
    }

    private BadgeCheckContext withFriendCount(int friendCount) {
        BadgeCheckContext base = zeroContext();
        return new BadgeCheckContext(
            base.currentStreak(), base.longestStreak(), base.currentLevel(), base.previousLevel(),
            base.todayActivities(), base.activityCounts(), friendCount,
            base.allActivitiesWereTrueBefore(), base.readingPlanProgress(),
            base.bibleProgress(), base.meditationHistory(), base.gratitudeEntries(),
            base.localVisits(), base.listeningHistory()
        );
    }

    private BadgeCheckContext withReadingPlans(List<ReadingPlanProgress> plans) {
        BadgeCheckContext base = zeroContext();
        return new BadgeCheckContext(
            base.currentStreak(), base.longestStreak(), base.currentLevel(), base.previousLevel(),
            base.todayActivities(), base.activityCounts(), base.friendCount(),
            base.allActivitiesWereTrueBefore(), plans,
            base.bibleProgress(), base.meditationHistory(), base.gratitudeEntries(),
            base.localVisits(), base.listeningHistory()
        );
    }

    private BadgeCheckContext withBibleProgress(BibleProgressSnapshot bp) {
        BadgeCheckContext base = zeroContext();
        return new BadgeCheckContext(
            base.currentStreak(), base.longestStreak(), base.currentLevel(), base.previousLevel(),
            base.todayActivities(), base.activityCounts(), base.friendCount(),
            base.allActivitiesWereTrueBefore(), base.readingPlanProgress(),
            bp, base.meditationHistory(), base.gratitudeEntries(),
            base.localVisits(), base.listeningHistory()
        );
    }

    private BadgeCheckContext withMeditationHistory(List<MeditationSession> sessions) {
        BadgeCheckContext base = zeroContext();
        return new BadgeCheckContext(
            base.currentStreak(), base.longestStreak(), base.currentLevel(), base.previousLevel(),
            base.todayActivities(), base.activityCounts(), base.friendCount(),
            base.allActivitiesWereTrueBefore(), base.readingPlanProgress(),
            base.bibleProgress(), sessions, base.gratitudeEntries(),
            base.localVisits(), base.listeningHistory()
        );
    }

    private BadgeCheckContext withGratitudeEntries(List<LocalDate> dates) {
        BadgeCheckContext base = zeroContext();
        return new BadgeCheckContext(
            base.currentStreak(), base.longestStreak(), base.currentLevel(), base.previousLevel(),
            base.todayActivities(), base.activityCounts(), base.friendCount(),
            base.allActivitiesWereTrueBefore(), base.readingPlanProgress(),
            base.bibleProgress(), base.meditationHistory(),
            new GratitudeEntriesSnapshot(dates),
            base.localVisits(), base.listeningHistory()
        );
    }

    private BadgeCheckContext withLocalVisits(int total) {
        BadgeCheckContext base = zeroContext();
        return new BadgeCheckContext(
            base.currentStreak(), base.longestStreak(), base.currentLevel(), base.previousLevel(),
            base.todayActivities(), base.activityCounts(), base.friendCount(),
            base.allActivitiesWereTrueBefore(), base.readingPlanProgress(),
            base.bibleProgress(), base.meditationHistory(), base.gratitudeEntries(),
            new LocalVisitsSnapshot(total), base.listeningHistory()
        );
    }

    private BadgeCheckContext withListeningHistory(List<ListeningSession> sessions) {
        BadgeCheckContext base = zeroContext();
        return new BadgeCheckContext(
            base.currentStreak(), base.longestStreak(), base.currentLevel(), base.previousLevel(),
            base.todayActivities(), base.activityCounts(), base.friendCount(),
            base.allActivitiesWereTrueBefore(), base.readingPlanProgress(),
            base.bibleProgress(), base.meditationHistory(), base.gratitudeEntries(),
            base.localVisits(), sessions
        );
    }

    private ActivityCountsSnapshot countsWithPray(int pray) {
        return new ActivityCountsSnapshot(pray, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }

    private ActivityCountsSnapshot countsWithJournal(int journal) {
        return new ActivityCountsSnapshot(0, journal, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }

    private ActivityCountsSnapshot countsWithEncouragements(int encouragementsSent) {
        return new ActivityCountsSnapshot(0, 0, 0, 0, 0, 0, 0, 0, encouragementsSent, 0, 0, 0, 0, 0, 0);
    }

    private ActivityCountsSnapshot countsWithIntercessions(int intercessions) {
        return new ActivityCountsSnapshot(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, intercessions, 0, 0, 0);
    }

    private ActivityCountsSnapshot countsWithPrayerWallPosts(int posts) {
        return new ActivityCountsSnapshot(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, posts, 0);
    }

    private ActivityCountsSnapshot countsWithQuickLifts(int quickLifts) {
        return new ActivityCountsSnapshot(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, quickLifts);
    }

    /** Build a fully complete bible progress map (all 66 books with all chapters). */
    private BibleProgressSnapshot fullBible() {
        Map<String, Set<Integer>> map = new HashMap<>();
        for (com.worshiproom.activity.constants.BibleBooks.Book book :
             com.worshiproom.activity.constants.BibleBooks.ALL) {
            Set<Integer> chapters = new HashSet<>();
            for (int i = 1; i <= book.chapters(); i++) chapters.add(i);
            map.put(book.slug(), chapters);
        }
        return new BibleProgressSnapshot(map);
    }

    private BibleProgressSnapshot bibleWithFirstNBooksComplete(int n) {
        Map<String, Set<Integer>> map = new HashMap<>();
        List<com.worshiproom.activity.constants.BibleBooks.Book> all =
            com.worshiproom.activity.constants.BibleBooks.ALL;
        for (int i = 0; i < Math.min(n, all.size()); i++) {
            com.worshiproom.activity.constants.BibleBooks.Book book = all.get(i);
            Set<Integer> chapters = new HashSet<>();
            for (int j = 1; j <= book.chapters(); j++) chapters.add(j);
            map.put(book.slug(), chapters);
        }
        return new BibleProgressSnapshot(map);
    }

    private BibleProgressSnapshot bibleWithTotalChapters(int totalChapters) {
        Map<String, Set<Integer>> map = new HashMap<>();
        Set<Integer> chapters = new HashSet<>();
        for (int i = 1; i <= totalChapters; i++) chapters.add(i);
        // Genesis has 50 chapters, so up to 50 fits in one book; for 25 we use Genesis only.
        map.put("genesis", chapters);
        return new BibleProgressSnapshot(map);
    }

    private List<MeditationSession> meditations(int n) {
        List<MeditationSession> list = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            list.add(new MeditationSession(LocalDateTime.now().minusDays(i), 600));
        }
        return list;
    }

    private List<LocalDate> consecutiveDays(int n, LocalDate start) {
        List<LocalDate> list = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            list.add(start.plusDays(i));
        }
        return list;
    }

    // === Group A: Streak (8 tests) ===

    @Nested
    @DisplayName("A) Streak badges")
    class StreakBadges {

        @Test
        void streak_7_firesAtThreshold() {
            BadgeResult r = service.checkBadges(withStreak(7), Set.of());
            assertThat(r.newlyEarnedBadgeIds()).contains("streak_7");
        }

        @Test
        void streak_14_firesAtThreshold() {
            BadgeResult r = service.checkBadges(withStreak(14), Set.of());
            assertThat(r.newlyEarnedBadgeIds()).contains("streak_14");
        }

        @Test
        void streak_30_firesAtThreshold() {
            BadgeResult r = service.checkBadges(withStreak(30), Set.of());
            assertThat(r.newlyEarnedBadgeIds()).contains("streak_30");
        }

        @Test
        void streak_60_firesAtThreshold() {
            BadgeResult r = service.checkBadges(withStreak(60), Set.of());
            assertThat(r.newlyEarnedBadgeIds()).contains("streak_60");
        }

        @Test
        void streak_90_firesAtThreshold() {
            BadgeResult r = service.checkBadges(withStreak(90), Set.of());
            assertThat(r.newlyEarnedBadgeIds()).contains("streak_90");
        }

        @Test
        void streak_180_firesAtThreshold() {
            BadgeResult r = service.checkBadges(withStreak(180), Set.of());
            assertThat(r.newlyEarnedBadgeIds()).contains("streak_180");
        }

        @Test
        void streak_365_firesAtThreshold() {
            BadgeResult r = service.checkBadges(withStreak(365), Set.of());
            assertThat(r.newlyEarnedBadgeIds()).contains("streak_365");
        }

        @Test
        void lowerStreakBadgeAlreadyEarned_isFilteredOut() {
            BadgeResult r = service.checkBadges(withStreak(14), Set.of("streak_7"));
            assertThat(r.newlyEarnedBadgeIds()).contains("streak_14").doesNotContain("streak_7");
        }
    }

    // === Group B: Level (4 tests) ===

    @Nested
    @DisplayName("B) Level badges")
    class LevelBadges {

        @Test
        void levelBadge_firesForCurrentLevel() {
            BadgeResult r = service.checkBadges(withLevel(3), Set.of());
            assertThat(r.newlyEarnedBadgeIds()).contains("level_3");
        }

        @Test
        void levelBadge_alreadyEarned_isFilteredOut() {
            BadgeResult r = service.checkBadges(withLevel(3), Set.of("level_3"));
            assertThat(r.newlyEarnedBadgeIds()).doesNotContain("level_3");
        }

        @Test
        void priorLevelBadges_doNotReFire() {
            BadgeResult r = service.checkBadges(withLevel(4), Set.of("level_1", "level_2", "level_3"));
            assertThat(r.newlyEarnedBadgeIds())
                .contains("level_4")
                .doesNotContain("level_1", "level_2", "level_3");
        }

        @Test
        void level6Cap_firesLevel6() {
            BadgeResult r = service.checkBadges(withLevel(6), Set.of());
            assertThat(r.newlyEarnedBadgeIds()).contains("level_6");
        }
    }

    // === Group C: Activity milestones (6 tests) ===

    @Nested
    @DisplayName("C) Activity milestones")
    class ActivityMilestones {

        @Test
        void firstPrayer_firesAtPrayCountOne() {
            BadgeResult r = service.checkBadges(withCounts(countsWithPray(1)), Set.of());
            assertThat(r.newlyEarnedBadgeIds()).contains("first_prayer");
        }

        @Test
        void prayer100_firesAtPrayCountOneHundred() {
            BadgeResult r = service.checkBadges(withCounts(countsWithPray(100)), Set.of("first_prayer"));
            assertThat(r.newlyEarnedBadgeIds()).contains("prayer_100");
        }

        @Test
        void prayer100_doesNotFireAtNinetyNine() {
            BadgeResult r = service.checkBadges(withCounts(countsWithPray(99)), Set.of("first_prayer"));
            assertThat(r.newlyEarnedBadgeIds()).doesNotContain("prayer_100");
        }

        @Test
        void firstJournal_firesAtJournalCountOne() {
            BadgeResult r = service.checkBadges(withCounts(countsWithJournal(1)), Set.of());
            assertThat(r.newlyEarnedBadgeIds()).contains("first_journal");
        }

        @Test
        void journal50_firesAtFifty() {
            BadgeResult r = service.checkBadges(withCounts(countsWithJournal(50)), Set.of("first_journal"));
            assertThat(r.newlyEarnedBadgeIds()).contains("journal_50");
        }

        @Test
        void journal100_firesAtOneHundred() {
            BadgeResult r = service.checkBadges(
                withCounts(countsWithJournal(100)),
                Set.of("first_journal", "journal_50")
            );
            assertThat(r.newlyEarnedBadgeIds()).contains("journal_100");
        }
    }

    // === Group D: Full Worship Day (6 tests) ===

    @Nested
    @DisplayName("D) Full Worship Day")
    class FullWorshipDay {

        private Set<ActivityType> sixBaseActivities() {
            return EnumSet.of(
                ActivityType.MOOD, ActivityType.PRAY, ActivityType.LISTEN,
                ActivityType.PRAYER_WALL, ActivityType.MEDITATE, ActivityType.JOURNAL
            );
        }

        @Test
        void allSixBaseActivities_noActivePlan_fires() {
            BadgeResult r = service.checkBadges(
                withTodayActivities(sixBaseActivities(), false, List.of()),
                Set.of()
            );
            assertThat(r.newlyEarnedBadgeIds()).contains("full_worship_day");
        }

        @Test
        void fiveOfSixBaseActivities_doesNotFire() {
            Set<ActivityType> five = EnumSet.of(
                ActivityType.MOOD, ActivityType.PRAY, ActivityType.LISTEN,
                ActivityType.PRAYER_WALL, ActivityType.MEDITATE
                // missing JOURNAL
            );
            BadgeResult r = service.checkBadges(
                withTodayActivities(five, false, List.of()),
                Set.of()
            );
            assertThat(r.newlyEarnedBadgeIds()).doesNotContain("full_worship_day");
        }

        @Test
        void allSixPlusReadingPlan_withActivePlan_requiresReadingPlanActivity() {
            Set<ActivityType> sevenWithPlan = EnumSet.copyOf(sixBaseActivities());
            sevenWithPlan.add(ActivityType.READING_PLAN);
            List<ReadingPlanProgress> activePlan = List.of(
                new ReadingPlanProgress("plan-a", null)
            );
            BadgeResult r = service.checkBadges(
                withTodayActivities(sevenWithPlan, false, activePlan),
                Set.of()
            );
            assertThat(r.newlyEarnedBadgeIds()).contains("full_worship_day");
        }

        @Test
        void activePlanWithoutReadingPlanActivity_doesNotFire() {
            List<ReadingPlanProgress> activePlan = List.of(
                new ReadingPlanProgress("plan-a", null)
            );
            BadgeResult r = service.checkBadges(
                withTodayActivities(sixBaseActivities(), false, activePlan),
                Set.of()
            );
            assertThat(r.newlyEarnedBadgeIds()).doesNotContain("full_worship_day");
        }

        @Test
        void allActivitiesWereTrueBefore_shortCircuits() {
            BadgeResult r = service.checkBadges(
                withTodayActivities(sixBaseActivities(), true, List.of()),
                Set.of()
            );
            assertThat(r.newlyEarnedBadgeIds()).doesNotContain("full_worship_day");
        }

        @Test
        void repeatable_alreadyEarned_stillFiresWhenConditionHolds() {
            BadgeResult r = service.checkBadges(
                withTodayActivities(sixBaseActivities(), false, List.of()),
                Set.of("full_worship_day")
            );
            assertThat(r.newlyEarnedBadgeIds()).contains("full_worship_day");
        }
    }

    // === Group E: Community (4 tests) ===

    @Nested
    @DisplayName("E) Community badges")
    class CommunityBadges {

        @Test
        void firstFriend_firesAtFriendCountOne() {
            BadgeResult r = service.checkBadges(withFriendCount(1), Set.of());
            assertThat(r.newlyEarnedBadgeIds()).contains("first_friend");
        }

        @Test
        void friends10_firesAtTen() {
            BadgeResult r = service.checkBadges(withFriendCount(10), Set.of("first_friend"));
            assertThat(r.newlyEarnedBadgeIds()).contains("friends_10");
        }

        @Test
        void encourage10_firesAtEncouragementsSentTen() {
            BadgeResult r = service.checkBadges(
                withCounts(countsWithEncouragements(10)),
                Set.of()
            );
            assertThat(r.newlyEarnedBadgeIds()).contains("encourage_10");
        }

        @Test
        void encourage50_firesAtFifty() {
            BadgeResult r = service.checkBadges(
                withCounts(countsWithEncouragements(50)),
                Set.of("encourage_10")
            );
            assertThat(r.newlyEarnedBadgeIds()).contains("encourage_50");
        }
    }

    // === Group F: Reading plans (3 tests) ===

    @Nested
    @DisplayName("F) Reading plan completion")
    class ReadingPlanCompletion {

        @Test
        void firstPlan_firesAtOneCompleted() {
            List<ReadingPlanProgress> plans = List.of(
                new ReadingPlanProgress("plan-a", LocalDateTime.now())
            );
            BadgeResult r = service.checkBadges(withReadingPlans(plans), Set.of());
            assertThat(r.newlyEarnedBadgeIds()).contains("first_plan");
        }

        @Test
        void plans3_firesAtThreeCompleted() {
            List<ReadingPlanProgress> plans = List.of(
                new ReadingPlanProgress("a", LocalDateTime.now()),
                new ReadingPlanProgress("b", LocalDateTime.now()),
                new ReadingPlanProgress("c", LocalDateTime.now())
            );
            BadgeResult r = service.checkBadges(withReadingPlans(plans), Set.of("first_plan"));
            assertThat(r.newlyEarnedBadgeIds()).contains("plans_3");
        }

        @Test
        void plans10_firesAtTenCompleted() {
            List<ReadingPlanProgress> plans = new ArrayList<>();
            for (int i = 0; i < 10; i++) {
                plans.add(new ReadingPlanProgress("plan-" + i, LocalDateTime.now()));
            }
            BadgeResult r = service.checkBadges(
                withReadingPlans(plans),
                Set.of("first_plan", "plans_3")
            );
            assertThat(r.newlyEarnedBadgeIds()).contains("plans_10");
        }
    }

    // === Group G: Bible book completion (4 tests) ===

    @Nested
    @DisplayName("G) Bible book completion")
    class BibleBookCompletion {

        @Test
        void bibleBook1_firesAtOneCompletedBook() {
            BadgeResult r = service.checkBadges(
                withBibleProgress(bibleWithFirstNBooksComplete(1)),
                Set.of()
            );
            assertThat(r.newlyEarnedBadgeIds()).contains("bible_book_1");
        }

        @Test
        void bibleBook5_firesAtFiveCompleted() {
            BadgeResult r = service.checkBadges(
                withBibleProgress(bibleWithFirstNBooksComplete(5)),
                Set.of("bible_book_1")
            );
            assertThat(r.newlyEarnedBadgeIds()).contains("bible_book_5");
        }

        @Test
        void bibleBook10_firesAtTenCompleted() {
            BadgeResult r = service.checkBadges(
                withBibleProgress(bibleWithFirstNBooksComplete(10)),
                Set.of("bible_book_1", "bible_book_5")
            );
            assertThat(r.newlyEarnedBadgeIds()).contains("bible_book_10");
        }

        @Test
        void bibleBook66_firesAtSixtySixCompleted() {
            BadgeResult r = service.checkBadges(
                withBibleProgress(fullBible()),
                Set.of("bible_book_1", "bible_book_5", "bible_book_10")
            );
            assertThat(r.newlyEarnedBadgeIds()).contains("bible_book_66");
        }
    }

    // === Group H: Meditation milestones (3 tests) ===

    @Nested
    @DisplayName("H) Meditation session milestones")
    class MeditationMilestones {

        @Test
        void meditate10_firesAtTenSessions() {
            BadgeResult r = service.checkBadges(withMeditationHistory(meditations(10)), Set.of());
            assertThat(r.newlyEarnedBadgeIds()).contains("meditate_10");
        }

        @Test
        void meditate50_firesAtFiftySessions() {
            BadgeResult r = service.checkBadges(
                withMeditationHistory(meditations(50)),
                Set.of("meditate_10")
            );
            assertThat(r.newlyEarnedBadgeIds()).contains("meditate_50");
        }

        @Test
        void meditate100_firesAtOneHundredSessions() {
            BadgeResult r = service.checkBadges(
                withMeditationHistory(meditations(100)),
                Set.of("meditate_10", "meditate_50")
            );
            assertThat(r.newlyEarnedBadgeIds()).contains("meditate_100");
        }
    }

    // === Group I: Prayer wall + intercession (3 tests) ===

    @Nested
    @DisplayName("I) Prayer wall posts and intercessions")
    class PrayerWallAndIntercession {

        @Test
        void prayerwallFirstPost_firesAtOnePost() {
            BadgeResult r = service.checkBadges(
                withCounts(countsWithPrayerWallPosts(1)),
                Set.of()
            );
            assertThat(r.newlyEarnedBadgeIds()).contains("prayerwall_first_post");
        }

        @Test
        void prayerwall10Posts_firesAtTen() {
            BadgeResult r = service.checkBadges(
                withCounts(countsWithPrayerWallPosts(10)),
                Set.of("prayerwall_first_post")
            );
            assertThat(r.newlyEarnedBadgeIds()).contains("prayerwall_10_posts");
        }

        @Test
        void prayerwall25Intercessions_firesAtTwentyFive() {
            BadgeResult r = service.checkBadges(
                withCounts(countsWithIntercessions(25)),
                Set.of()
            );
            assertThat(r.newlyEarnedBadgeIds()).contains("prayerwall_25_intercessions");
        }

        @Test
        void faithfulWatcher_firesAtTen() {
            BadgeResult r = service.checkBadges(
                withCounts(countsWithQuickLifts(10)),
                Set.of()
            );
            assertThat(r.newlyEarnedBadgeIds()).contains("faithful_watcher");
        }

        @Test
        void faithfulWatcher_doesNotFireAtNine() {
            BadgeResult r = service.checkBadges(
                withCounts(countsWithQuickLifts(9)),
                Set.of()
            );
            assertThat(r.newlyEarnedBadgeIds()).doesNotContain("faithful_watcher");
        }

        @Test
        void faithfulWatcher_doesNotRefireWhenAlreadyEarned() {
            BadgeResult r = service.checkBadges(
                withCounts(countsWithQuickLifts(11)),
                Set.of("faithful_watcher")
            );
            assertThat(r.newlyEarnedBadgeIds()).doesNotContain("faithful_watcher");
        }
    }

    // === Group J: Bible chapter milestones (3 tests) ===

    @Nested
    @DisplayName("J) Bible chapter milestones")
    class BibleChapterMilestones {

        @Test
        void bibleFirstChapter_firesAtOneTotalChapter() {
            BadgeResult r = service.checkBadges(
                withBibleProgress(bibleWithTotalChapters(1)),
                Set.of()
            );
            assertThat(r.newlyEarnedBadgeIds()).contains("bible_first_chapter");
        }

        @Test
        void bible10Chapters_firesAtTen() {
            BadgeResult r = service.checkBadges(
                withBibleProgress(bibleWithTotalChapters(10)),
                Set.of("bible_first_chapter")
            );
            assertThat(r.newlyEarnedBadgeIds()).contains("bible_10_chapters");
        }

        @Test
        void bible25Chapters_firesAtTwentyFive() {
            BadgeResult r = service.checkBadges(
                withBibleProgress(bibleWithTotalChapters(25)),
                Set.of("bible_first_chapter", "bible_10_chapters")
            );
            assertThat(r.newlyEarnedBadgeIds()).contains("bible_25_chapters");
        }
    }

    // === Group K: Gratitude (5 tests) ===

    @Nested
    @DisplayName("K) Gratitude milestones")
    class GratitudeMilestones {

        @Test
        void gratitude30Days_firesAtThirtyUniqueDates() {
            List<LocalDate> dates = consecutiveDays(30, LocalDate.of(2026, 1, 1));
            BadgeResult r = service.checkBadges(withGratitudeEntries(dates), Set.of("gratitude_7_streak"));
            assertThat(r.newlyEarnedBadgeIds()).contains("gratitude_30_days");
        }

        @Test
        void gratitude100Days_firesAtOneHundred() {
            List<LocalDate> dates = consecutiveDays(100, LocalDate.of(2026, 1, 1));
            BadgeResult r = service.checkBadges(
                withGratitudeEntries(dates),
                Set.of("gratitude_7_streak", "gratitude_30_days")
            );
            assertThat(r.newlyEarnedBadgeIds()).contains("gratitude_100_days");
        }

        @Test
        void gratitude7Streak_firesWith7ConsecutiveDates() {
            List<LocalDate> dates = consecutiveDays(7, LocalDate.of(2026, 4, 20));
            BadgeResult r = service.checkBadges(withGratitudeEntries(dates), Set.of());
            assertThat(r.newlyEarnedBadgeIds()).contains("gratitude_7_streak");
        }

        @Test
        void gratitude7Streak_doesNotFireWith7DisjointDates() {
            // 7 unique dates spread across 7 weeks (max consecutive run = 1)
            List<LocalDate> dates = List.of(
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 1, 8),
                LocalDate.of(2026, 1, 15),
                LocalDate.of(2026, 1, 22),
                LocalDate.of(2026, 1, 29),
                LocalDate.of(2026, 2, 5),
                LocalDate.of(2026, 2, 12)
            );
            BadgeResult r = service.checkBadges(withGratitudeEntries(dates), Set.of());
            assertThat(r.newlyEarnedBadgeIds()).doesNotContain("gratitude_7_streak");
        }

        @Test
        void gratitude7Streak_doesNotFireWithFewerThan7TotalDays() {
            List<LocalDate> dates = consecutiveDays(5, LocalDate.of(2026, 4, 20));
            BadgeResult r = service.checkBadges(withGratitudeEntries(dates), Set.of());
            assertThat(r.newlyEarnedBadgeIds()).doesNotContain("gratitude_7_streak");
        }
    }

    // === Group L: Local support (3 tests) ===

    @Nested
    @DisplayName("L) Local support visits")
    class LocalSupport {

        @Test
        void localFirstVisit_firesAtTotalOne() {
            BadgeResult r = service.checkBadges(withLocalVisits(1), Set.of());
            assertThat(r.newlyEarnedBadgeIds()).contains("local_first_visit");
        }

        @Test
        void localSupport5_firesAtTotalFive() {
            BadgeResult r = service.checkBadges(withLocalVisits(5), Set.of("local_first_visit"));
            assertThat(r.newlyEarnedBadgeIds()).contains("local_support_5");
        }

        @Test
        void bothLocalBadges_fireTogetherAtTotalFive() {
            BadgeResult r = service.checkBadges(withLocalVisits(5), Set.of());
            assertThat(r.newlyEarnedBadgeIds())
                .contains("local_first_visit", "local_support_5");
        }
    }

    // === Group M: Listening (2 tests) ===

    @Nested
    @DisplayName("M) Listening hours")
    class Listening {

        @Test
        void listen10Hours_firesAtExactly36000Seconds() {
            BadgeResult r = service.checkBadges(
                withListeningHistory(List.of(new ListeningSession(LocalDateTime.now(), 36000))),
                Set.of()
            );
            assertThat(r.newlyEarnedBadgeIds()).contains("listen_10_hours");
        }

        @Test
        void listen10Hours_doesNotFireAt35999Seconds() {
            BadgeResult r = service.checkBadges(
                withListeningHistory(List.of(new ListeningSession(LocalDateTime.now(), 35999))),
                Set.of()
            );
            assertThat(r.newlyEarnedBadgeIds()).doesNotContain("listen_10_hours");
        }
    }

    // === Group N: Idempotency (3 tests) ===

    @Nested
    @DisplayName("N) Idempotency")
    class Idempotency {

        @Test
        void secondCallWithEarnedSet_returnsZeroNonRepeatableBadges() {
            // First call: streak=14, level=2 → should earn streak_7, streak_14, level_2
            BadgeCheckContext ctx = new BadgeCheckContext(
                14, 14, 2, 1,
                EnumSet.noneOf(ActivityType.class),
                ActivityCountsSnapshot.zeros(),
                0, false,
                List.of(), BibleProgressSnapshot.empty(),
                List.of(), GratitudeEntriesSnapshot.empty(),
                LocalVisitsSnapshot.zero(), List.of()
            );
            BadgeResult first = service.checkBadges(ctx, Set.of());
            assertThat(first.newlyEarnedBadgeIds()).contains("streak_7", "streak_14", "level_2");

            // Second call with all earned in alreadyEarned set → empty
            Set<String> earned = new HashSet<>(first.newlyEarnedBadgeIds());
            BadgeResult second = service.checkBadges(ctx, earned);
            assertThat(second.newlyEarnedBadgeIds()).isEmpty();
        }

        @Test
        void fullWorshipDay_firesEveryCallWhenConditionHolds() {
            Set<ActivityType> sixBase = EnumSet.of(
                ActivityType.MOOD, ActivityType.PRAY, ActivityType.LISTEN,
                ActivityType.PRAYER_WALL, ActivityType.MEDITATE, ActivityType.JOURNAL
            );
            BadgeCheckContext ctx = withTodayActivities(sixBase, false, List.of());

            BadgeResult r1 = service.checkBadges(ctx, Set.of());
            assertThat(r1.newlyEarnedBadgeIds()).contains("full_worship_day");

            BadgeResult r2 = service.checkBadges(ctx, Set.of("full_worship_day"));
            assertThat(r2.newlyEarnedBadgeIds()).contains("full_worship_day");

            BadgeResult r3 = service.checkBadges(ctx, Set.of("full_worship_day"));
            assertThat(r3.newlyEarnedBadgeIds()).contains("full_worship_day");
        }

        @Test
        void mixedScenario_streakLevelsAndFullWorshipDay() {
            Set<ActivityType> sixBase = EnumSet.of(
                ActivityType.MOOD, ActivityType.PRAY, ActivityType.LISTEN,
                ActivityType.PRAYER_WALL, ActivityType.MEDITATE, ActivityType.JOURNAL
            );
            BadgeCheckContext ctx = new BadgeCheckContext(
                7, 7, 1, 1,
                sixBase,
                ActivityCountsSnapshot.zeros(),
                0, false,
                List.of(), BibleProgressSnapshot.empty(),
                List.of(), GratitudeEntriesSnapshot.empty(),
                LocalVisitsSnapshot.zero(), List.of()
            );
            // First call earns streak_7, level_1, full_worship_day
            BadgeResult first = service.checkBadges(ctx, Set.of());
            assertThat(first.newlyEarnedBadgeIds())
                .contains("streak_7", "level_1", "full_worship_day");

            // Second call with all five in earned + condition still met → only full_worship_day
            BadgeResult second = service.checkBadges(
                ctx,
                Set.of("streak_7", "level_1", "full_worship_day")
            );
            assertThat(second.newlyEarnedBadgeIds())
                .containsExactly("full_worship_day");
        }
    }

    // === Group O: Empty / defensive (3 tests) ===

    @Nested
    @DisplayName("O) Empty and defensive")
    class EmptyAndDefensive {

        @Test
        void emptyContext_returnsOnlyLevel1() {
            BadgeResult r = service.checkBadges(zeroContext(), Set.of());
            assertThat(r.newlyEarnedBadgeIds()).containsExactly("level_1");
        }

        @Test
        void emptyContextWithLevel1Earned_returnsZeroBadges() {
            BadgeResult r = service.checkBadges(zeroContext(), Set.of("level_1"));
            assertThat(r.newlyEarnedBadgeIds()).isEmpty();
        }

        @Test
        void welcomeAndChallengeBadges_neverAppearInCheckBadgesResult() {
            // Maxed-out context — all categories fire
            Set<ActivityType> allActivities = EnumSet.allOf(ActivityType.class);
            ActivityCountsSnapshot maxedCounts = new ActivityCountsSnapshot(
                100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100
            );
            List<ReadingPlanProgress> tenPlans = new ArrayList<>();
            for (int i = 0; i < 10; i++) {
                tenPlans.add(new ReadingPlanProgress("p" + i, LocalDateTime.now()));
            }
            BadgeCheckContext maxed = new BadgeCheckContext(
                365, 365, 6, 5,
                allActivities,
                maxedCounts,
                10, false,
                tenPlans,
                fullBible(),
                meditations(100),
                new GratitudeEntriesSnapshot(consecutiveDays(100, LocalDate.of(2026, 1, 1))),
                new LocalVisitsSnapshot(5),
                List.of(new ListeningSession(LocalDateTime.now(), 36000))
            );
            BadgeResult r = service.checkBadges(maxed, Set.of());
            assertThat(r.newlyEarnedBadgeIds()).doesNotContain("welcome");
            assertThat(r.newlyEarnedBadgeIds())
                .doesNotContain(
                    "challenge_lent", "challenge_easter", "challenge_pentecost",
                    "challenge_advent", "challenge_newyear", "challenge_first",
                    "challenge_master"
                );
        }
    }

    // === Group P: Input validation (3 tests) ===

    @Nested
    @DisplayName("P) Input validation")
    class InputValidation {

        @Test
        void nullContext_throwsIllegalArgumentException() {
            assertThatThrownBy(() -> service.checkBadges(null, Set.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("context");
        }

        @Test
        void nullEarnedSet_throwsIllegalArgumentException() {
            assertThatThrownBy(() -> service.checkBadges(zeroContext(), null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("alreadyEarnedBadgeIds");
        }

        @Test
        void nullCollectionFieldsInContext_treatedAsEmpty() {
            // Build a context with null collection fields — record's compact
            // constructor should defensively replace each with safe empties.
            BadgeCheckContext ctx = new BadgeCheckContext(
                0, 0, 1, 1,
                null, null, 0, false,
                null, null, null, null, null, null
            );
            BadgeResult r = service.checkBadges(ctx, Set.of());
            assertThat(r.newlyEarnedBadgeIds()).containsExactly("level_1");
        }
    }
}
