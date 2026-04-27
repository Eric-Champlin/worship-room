package com.worshiproom.activity;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.worshiproom.activity.constants.LevelThresholds;
import com.worshiproom.activity.dto.ActivityCountsSnapshot;
import com.worshiproom.activity.dto.BadgeResult;
import com.worshiproom.activity.dto.BibleProgressSnapshot;
import com.worshiproom.activity.dto.GratitudeEntriesSnapshot;
import com.worshiproom.activity.dto.ListeningSession;
import com.worshiproom.activity.dto.LocalVisitsSnapshot;
import com.worshiproom.activity.dto.MeditationSession;
import com.worshiproom.activity.dto.ReadingPlanProgress;
import com.worshiproom.activity.dto.StreakResult;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import java.io.File;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

import static org.assertj.core.api.Assertions.assertThat;

class DriftDetectionTest {

    private static final ObjectMapper MAPPER = JsonMapper.builder()
        .addModule(new JavaTimeModule())
        .build();

    private final FaithPointsService faithPointsService = new FaithPointsService();
    private final StreakService streakService = new StreakService();
    private final BadgeService badgeService = new BadgeService();

    @ParameterizedTest(name = "{0}")
    @MethodSource("allScenarios")
    void scenarioMatchesBackendComputation(DriftScenario scenario) {
        DriftResult actual = runBackend(scenario.input());
        assertThat(actual)
            .as("Drift detected in scenario: %s — %s", scenario.id(), scenario.description())
            .isEqualTo(toResult(scenario.expected()));
    }

    static Stream<DriftScenario> allScenarios() throws IOException {
        File fixtureFile = new File("../_test_fixtures/activity-engine-scenarios.json");
        JsonNode root = MAPPER.readTree(fixtureFile);
        JsonNode scenariosNode = root.get("scenarios");
        return StreamSupport.stream(scenariosNode.spliterator(), false)
            .map(node -> {
                try {
                    return MAPPER.treeToValue(node, DriftScenario.class);
                } catch (Exception e) {
                    throw new RuntimeException(
                        "Failed to deserialize scenario: " + node.path("id").asText(), e);
                }
            });
    }

    private DriftResult runBackend(DriftInput input) {
        if (Boolean.TRUE.equals(input.todaysActivitiesBefore().get(input.newActivityType()))) {
            return new DriftResult(
                0,
                input.currentTotalPoints(),
                input.currentLevel(),
                false,
                input.currentStreak(),
                input.longestStreak(),
                "SAME_DAY",
                List.of(),
                isFreeRepairAvailable(input)
            );
        }

        Set<ActivityType> oldSet = activeActivities(input.todaysActivitiesBefore());
        Set<ActivityType> newSet = EnumSet.copyOf(addOrEmpty(oldSet));
        newSet.add(ActivityType.fromWireValue(input.newActivityType()));

        int oldPoints = oldSet.isEmpty()
            ? 0
            : faithPointsService.calculate(oldSet, 0).pointsEarned();
        int newPoints = faithPointsService.calculate(newSet, 0).pointsEarned();
        int pointsDelta = newPoints - oldPoints;
        int newTotalPoints = input.currentTotalPoints() + pointsDelta;

        LevelThresholds.LevelInfo levelInfo = LevelThresholds.levelForPoints(newTotalPoints);
        boolean levelUp = levelInfo.level() > input.currentLevel();

        StreakStateData currentStreakState = new StreakStateData(
            input.currentStreak(),
            input.longestStreak(),
            input.lastActiveDate()
        );
        StreakResult streakResult = streakService.updateStreak(currentStreakState, input.today());

        Map<String, Integer> incrementedCounts = new HashMap<>(input.activityCounts());
        Optional<CountType> countTypeOpt = CountType.fromWireValue(input.newActivityType());
        if (countTypeOpt.isPresent()) {
            String key = countTypeOpt.get().wireValue();
            incrementedCounts.merge(key, 1, Integer::sum);
        }

        ActivityCountsSnapshot countsSnapshot = new ActivityCountsSnapshot(
            incrementedCounts.getOrDefault("pray", 0),
            incrementedCounts.getOrDefault("journal", 0),
            incrementedCounts.getOrDefault("meditate", 0),
            incrementedCounts.getOrDefault("listen", 0),
            incrementedCounts.getOrDefault("prayerWall", 0),
            incrementedCounts.getOrDefault("readingPlan", 0),
            incrementedCounts.getOrDefault("gratitude", 0),
            incrementedCounts.getOrDefault("reflection", 0),
            input.encouragementsSent(),
            input.fullWorshipDays(),
            input.challengesCompleted(),
            input.intercessionCount(),
            input.bibleChaptersRead(),
            input.prayerWallPosts()
        );

        BadgeCheckContext context = new BadgeCheckContext(
            streakResult.newState().currentStreak(),
            streakResult.newState().longestStreak(),
            levelInfo.level(),
            input.currentLevel(),
            EnumSet.copyOf(addOrEmpty(newSet)),
            countsSnapshot,
            input.friendCount(),
            false,
            buildReadingPlans(input),
            buildBibleProgress(input),
            buildMeditationHistory(input),
            buildGratitudeEntries(input),
            new LocalVisitsSnapshot(input.localVisitsTotal()),
            buildListeningHistory(input)
        );

        Set<String> alreadyEarned = new HashSet<>(input.alreadyEarnedBadgeIds());
        BadgeResult badgeResult = badgeService.checkBadges(context, alreadyEarned);

        List<String> sortedBadges = new ArrayList<>(badgeResult.newlyEarnedBadgeIds());
        Collections.sort(sortedBadges);

        return new DriftResult(
            pointsDelta,
            newTotalPoints,
            levelInfo.level(),
            levelUp,
            streakResult.newState().currentStreak(),
            streakResult.newState().longestStreak(),
            streakResult.transition().name(),
            sortedBadges,
            isFreeRepairAvailable(input)
        );
    }

    private Set<ActivityType> activeActivities(Map<String, Boolean> map) {
        Set<ActivityType> result = EnumSet.noneOf(ActivityType.class);
        for (Map.Entry<String, Boolean> entry : map.entrySet()) {
            if (Boolean.TRUE.equals(entry.getValue())) {
                result.add(ActivityType.fromWireValue(entry.getKey()));
            }
        }
        return result;
    }

    /**
     * EnumSet.copyOf throws on empty input; this helper returns the empty
     * EnumSet sentinel when the source is empty so subsequent .add calls work.
     */
    private Set<ActivityType> addOrEmpty(Set<ActivityType> src) {
        if (src.isEmpty()) {
            return EnumSet.noneOf(ActivityType.class);
        }
        return src;
    }

    private boolean isFreeRepairAvailable(DriftInput input) {
        return streakService.isFreeRepairAvailable(input.lastFreeRepairDate(), input.currentWeekStart());
    }

    private List<ReadingPlanProgress> buildReadingPlans(DriftInput input) {
        return input.readingPlanProgress().stream()
            .map(p -> new ReadingPlanProgress(
                p.planSlug(),
                p.completedAt() == null ? null : LocalDateTime.parse(p.completedAt())))
            .toList();
    }

    private BibleProgressSnapshot buildBibleProgress(DriftInput input) {
        Map<String, Set<Integer>> map = new HashMap<>();
        input.bibleProgress().forEach((book, list) -> map.put(book, new HashSet<>(list)));
        return new BibleProgressSnapshot(map);
    }

    private List<MeditationSession> buildMeditationHistory(DriftInput input) {
        return input.meditationHistory().stream()
            .map(m -> new MeditationSession(LocalDateTime.parse(m.occurredAt()), m.durationSeconds()))
            .toList();
    }

    private GratitudeEntriesSnapshot buildGratitudeEntries(DriftInput input) {
        return new GratitudeEntriesSnapshot(
            input.gratitudeEntryDates().stream().map(LocalDate::parse).toList()
        );
    }

    private List<ListeningSession> buildListeningHistory(DriftInput input) {
        return input.listeningHistory().stream()
            .map(l -> new ListeningSession(LocalDateTime.parse(l.occurredAt()), l.durationSeconds()))
            .toList();
    }

    private DriftResult toResult(DriftExpected expected) {
        return new DriftResult(
            expected.pointsEarned(),
            expected.newTotalPoints(),
            expected.newCurrentLevel(),
            expected.levelUp(),
            expected.newCurrentStreak(),
            expected.newLongestStreak(),
            expected.streakTransition(),
            expected.newBadgeIds(),
            expected.isFreeRepairAvailableAfter()
        );
    }
}
