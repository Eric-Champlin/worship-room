import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import scenarios from '../../../../_test_fixtures/activity-engine-scenarios.json';
import {
  calculateDailyPoints,
  freshDailyActivities,
  updateStreak,
} from '@/services/faith-points-storage';
import { checkForNewBadges, type BadgeCheckContext } from '@/services/badge-engine';
import { getLevelForPoints } from '@/constants/dashboard/levels';
import type {
  ActivityType,
  DailyActivities,
  StreakData,
  ActivityCounts,
  BadgeEarnedEntry,
} from '@/types/dashboard';

interface DriftInput {
  userTimezone: string;
  today: string;
  currentWeekStart: string;
  currentTotalPoints: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  lastFreeRepairDate: string | null;
  todaysActivitiesBefore: Record<string, boolean>;
  newActivityType: ActivityType;
  alreadyEarnedBadgeIds: string[];
  friendCount: number;
  encouragementsSent: number;
  fullWorshipDays: number;
  challengesCompleted: number;
  intercessionCount: number;
  bibleChaptersRead: number;
  prayerWallPosts: number;
  readingPlanProgress: Array<{ planSlug: string; completedAt: string | null }>;
  bibleProgress: Record<string, number[]>;
  meditationHistory: Array<{ occurredAt: string; durationSeconds: number }>;
  gratitudeEntryDates: string[];
  localVisitsTotal: number;
  listeningHistory: Array<{ occurredAt: string; durationSeconds: number }>;
  activityCounts: ActivityCounts;
}

interface DriftExpected {
  pointsEarned: number;
  newTotalPoints: number;
  newCurrentLevel: number;
  levelUp: boolean;
  newCurrentStreak: number;
  newLongestStreak: number;
  streakTransition: 'FIRST_EVER' | 'SAME_DAY' | 'INCREMENT' | 'RESET';
  newBadgeIds: string[];
  isFreeRepairAvailableAfter: boolean;
}

const ACTIVITY_KEYS: ActivityType[] = [
  'mood', 'pray', 'listen', 'prayerWall', 'readingPlan',
  'meditate', 'journal', 'gratitude', 'reflection',
  'challenge', 'localVisit', 'devotional',
];

function activeActivities(map: Record<string, boolean>): Set<ActivityType> {
  const result = new Set<ActivityType>();
  for (const key of ACTIVITY_KEYS) {
    if (map[key]) result.add(key);
  }
  return result;
}

function buildDailyActivities(active: Set<ActivityType>): DailyActivities {
  const activities = freshDailyActivities();
  for (const key of active) {
    (activities as unknown as Record<ActivityType, boolean>)[key] = true;
  }
  return activities;
}

function deriveStreakTransition(
  oldLastActive: string | null,
  today: string,
): 'FIRST_EVER' | 'SAME_DAY' | 'INCREMENT' | 'RESET' {
  if (oldLastActive === null) return 'FIRST_EVER';
  if (oldLastActive === today) return 'SAME_DAY';
  const todayDate = new Date(today + 'T00:00:00');
  const yesterday = new Date(todayDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  if (oldLastActive === yesterdayStr) return 'INCREMENT';
  return 'RESET';
}

function pureFreeRepairAvailable(
  lastFreeRepairDate: string | null,
  currentWeekStart: string,
): boolean {
  if (lastFreeRepairDate === null) return true;
  return lastFreeRepairDate < currentWeekStart;
}

function seedLocalStorageFromInput(input: DriftInput): void {
  const planMap: Record<string, { completedAt: string | null }> = {};
  for (const p of input.readingPlanProgress) {
    planMap[p.planSlug] = { completedAt: p.completedAt };
  }
  localStorage.setItem('wr_reading_plan_progress', JSON.stringify(planMap));

  localStorage.setItem('wr_bible_progress', JSON.stringify(input.bibleProgress));

  const gratitudeEntries = input.gratitudeEntryDates.map((date, i) => ({
    id: `g-${i}`,
    date,
    items: [],
    createdAt: `${date}T08:00:00.000Z`,
  }));
  localStorage.setItem('wr_gratitude_entries', JSON.stringify(gratitudeEntries));

  const meditationSessions = input.meditationHistory.map((m, i) => ({
    id: `m-${i}`,
    type: 'breathing',
    date: m.occurredAt.slice(0, 10),
    durationMinutes: Math.max(1, Math.round(m.durationSeconds / 60)),
    completedAt: m.occurredAt,
  }));
  localStorage.setItem('wr_meditation_history', JSON.stringify(meditationSessions));

  const visits = Array.from({ length: input.localVisitsTotal }, (_, i) => ({
    id: `v-${i}`,
    placeId: `place-${i}`,
    placeType: 'church',
    placeName: `Place ${i}`,
    visitedAt: `${input.today}T08:00:00.000Z`,
  }));
  localStorage.setItem('wr_local_visits', JSON.stringify(visits));

  localStorage.setItem('wr_listening_history', JSON.stringify(input.listeningHistory));
}

function runFrontend(input: DriftInput): DriftExpected {
  if (input.todaysActivitiesBefore[input.newActivityType] === true) {
    return {
      pointsEarned: 0,
      newTotalPoints: input.currentTotalPoints,
      newCurrentLevel: input.currentLevel,
      levelUp: false,
      newCurrentStreak: input.currentStreak,
      newLongestStreak: input.longestStreak,
      streakTransition: 'SAME_DAY',
      newBadgeIds: [],
      isFreeRepairAvailableAfter: pureFreeRepairAvailable(
        input.lastFreeRepairDate,
        input.currentWeekStart,
      ),
    };
  }

  const oldSet = activeActivities(input.todaysActivitiesBefore);
  const newSet = new Set(oldSet);
  newSet.add(input.newActivityType);

  const oldDaily = oldSet.size === 0
    ? { points: 0, multiplier: 1 }
    : calculateDailyPoints(buildDailyActivities(oldSet));
  const newDaily = calculateDailyPoints(buildDailyActivities(newSet));
  const pointsDelta = newDaily.points - oldDaily.points;
  const newTotalPoints = input.currentTotalPoints + pointsDelta;

  const levelInfo = getLevelForPoints(newTotalPoints);
  const levelUp = levelInfo.level > input.currentLevel;

  const currentStreakData: StreakData = {
    currentStreak: input.currentStreak,
    longestStreak: input.longestStreak,
    lastActiveDate: input.lastActiveDate,
  };
  const newStreak = updateStreak(input.today, currentStreakData);
  const streakTransition = deriveStreakTransition(input.lastActiveDate, input.today);

  const incrementedCounts: ActivityCounts = { ...input.activityCounts };
  const COUNT_KEYS: Record<string, keyof ActivityCounts | null> = {
    pray: 'pray', journal: 'journal', meditate: 'meditate', listen: 'listen',
    prayerWall: 'prayerWall', readingPlan: 'readingPlan',
    gratitude: 'gratitude', reflection: 'reflection',
    mood: null, devotional: null, challenge: null, localVisit: null,
  };
  const countKey = COUNT_KEYS[input.newActivityType];
  if (countKey) {
    incrementedCounts[countKey] = (incrementedCounts[countKey] ?? 0) + 1;
  }

  const earned: Record<string, BadgeEarnedEntry> = {};
  for (const id of input.alreadyEarnedBadgeIds) {
    earned[id] = { earnedAt: input.today };
  }

  const context: BadgeCheckContext = {
    streak: newStreak,
    level: levelInfo.level,
    previousLevel: input.currentLevel,
    todayActivities: buildDailyActivities(newSet),
    activityCounts: incrementedCounts,
    friendCount: input.friendCount,
    allActivitiesWereTrueBefore: false,
  };

  const newBadgeIds = checkForNewBadges(context, earned).slice().sort();

  return {
    pointsEarned: pointsDelta,
    newTotalPoints,
    newCurrentLevel: levelInfo.level,
    levelUp,
    newCurrentStreak: newStreak.currentStreak,
    newLongestStreak: newStreak.longestStreak,
    streakTransition,
    newBadgeIds,
    isFreeRepairAvailableAfter: pureFreeRepairAvailable(
      input.lastFreeRepairDate,
      input.currentWeekStart,
    ),
  };
}

interface ScenarioEntry {
  id: string;
  description: string;
  input: DriftInput;
  expected: DriftExpected;
}

const SCENARIOS = scenarios.scenarios as ScenarioEntry[];

describe('activity engine drift detection', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe.each(SCENARIOS)(
    'scenario $id',
    ({ id, input, expected }) => {
      it('matches frontend computation', () => {
        // The frontend updateStreak() calls getYesterdayDateString() which reads
        // system time. Pin the system clock to noon of the fixture's "today" so
        // the streak logic is deterministic per-scenario.
        vi.setSystemTime(new Date(input.today + 'T12:00:00'));
        seedLocalStorageFromInput(input);
        const actual = runFrontend(input);
        expect(actual).toEqual(expected);
        // Suppress unused-variable warning on `id` — it's already in the describe name.
        void id;
      });
    },
  );
});
