import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getLocalDateString, getCurrentWeekStart } from '@/utils/date';
import { getMoodEntries } from '@/services/mood-storage';
import {
  getActivityLog,
  getFaithPoints,
  getStreakData,
  calculateDailyPoints,
  updateStreak,
  persistAll,
  freshDailyActivities,
} from '@/services/faith-points-storage';
import {
  capturePreviousStreak,
  getRepairData,
  isFreeRepairAvailable as isFreeRepairAvailableFn,
  saveRepairData,
} from '@/services/streak-repair-storage';
import { getLevelForPoints } from '@/constants/dashboard/levels';
import {
  getOrInitBadgeData,
  incrementActivityCount,
  addEarnedBadge,
  saveBadgeData,
  getFriendCount,
  clearNewlyEarned as clearNewlyEarnedData,
} from '@/services/badge-storage';
import { checkForNewBadges } from '@/services/badge-engine';
import type { ActivityType, DailyActivities, FaithPointsData, StreakData, StreakRepairData } from '@/types/dashboard';

interface FaithPointsState {
  totalPoints: number;
  currentLevel: number;
  levelName: string;
  pointsToNextLevel: number;
  todayActivities: Record<ActivityType, boolean>;
  todayPoints: number;
  todayMultiplier: number;
  currentStreak: number;
  longestStreak: number;
  newlyEarnedBadges: string[];
  previousStreak: number | null;
  isFreeRepairAvailable: boolean;
}

const DEFAULT_STATE: FaithPointsState = {
  totalPoints: 0,
  currentLevel: 1,
  levelName: 'Seedling',
  pointsToNextLevel: 100,
  todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, readingPlan: false, meditate: false, journal: false, gratitude: false, reflection: false, challenge: false, localVisit: false, devotional: false },
  todayPoints: 0,
  todayMultiplier: 1,
  currentStreak: 0,
  longestStreak: 0,
  newlyEarnedBadges: [],
  previousStreak: null,
  isFreeRepairAvailable: false,
};

function extractActivities(da: DailyActivities): Record<ActivityType, boolean> {
  return {
    mood: da.mood,
    pray: da.pray,
    listen: da.listen,
    prayerWall: da.prayerWall,
    readingPlan: da.readingPlan,
    meditate: da.meditate,
    journal: da.journal,
    gratitude: da.gratitude,
    reflection: da.reflection,
    challenge: da.challenge,
    localVisit: da.localVisit,
    devotional: da.devotional ?? false,
  };
}

function loadState(): FaithPointsState {
  const activityLog = getActivityLog();
  const today = getLocalDateString();
  let todayEntry = activityLog[today] ?? freshDailyActivities();

  // Mood auto-detect from wr_mood_entries
  if (!todayEntry.mood) {
    const moodEntries = getMoodEntries();
    const hasMoodToday = moodEntries.some((e) => e.date === today);
    if (hasMoodToday) {
      todayEntry = { ...todayEntry, mood: true };
      const { points, multiplier } = calculateDailyPoints(todayEntry);
      todayEntry.pointsEarned = points;
      todayEntry.multiplier = multiplier;
      // Write back updated entry (will be persisted if auth'd by caller)
      activityLog[today] = todayEntry;
    }
  }

  const faithPoints = getFaithPoints();
  const streak = getStreakData();

  // Initialize badges if needed (first authenticated session)
  const badgeData = getOrInitBadgeData(true);

  const repairData = getRepairData();

  return {
    totalPoints: faithPoints.totalPoints,
    currentLevel: faithPoints.currentLevel,
    levelName: faithPoints.currentLevelName,
    pointsToNextLevel: faithPoints.pointsToNextLevel,
    todayActivities: extractActivities(todayEntry),
    todayPoints: todayEntry.pointsEarned,
    todayMultiplier: todayEntry.multiplier,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    newlyEarnedBadges: badgeData.newlyEarned,
    previousStreak: repairData.previousStreak,
    isFreeRepairAvailable: isFreeRepairAvailableFn(),
  };
}

const noopRecordActivity = () => {};
const noopClearNewlyEarned = () => {};
const noopRepairStreak = (_useFreeRepair: boolean) => {};

export function useFaithPoints(): FaithPointsState & {
  recordActivity: (type: ActivityType) => void
  clearNewlyEarnedBadges: () => void
  repairStreak: (useFreeRepair: boolean) => void
} {
  const { isAuthenticated } = useAuth();

  const [state, setState] = useState<FaithPointsState>(() => {
    if (!isAuthenticated) return DEFAULT_STATE;
    return loadState();
  });

  const recordActivity = useCallback((type: ActivityType) => {
    if (!isAuthenticated) return;

    const today = getLocalDateString();
    const activityLog = getActivityLog();
    const todayEntry = activityLog[today] ?? freshDailyActivities();

    // Idempotency check
    if (todayEntry[type]) return;

    // Set activity
    todayEntry[type] = true;

    // Recalculate daily points
    const { points: newDailyPoints, multiplier: newMultiplier } = calculateDailyPoints(todayEntry);
    const pointDifference = newDailyPoints - todayEntry.pointsEarned;
    todayEntry.pointsEarned = newDailyPoints;
    todayEntry.multiplier = newMultiplier;

    // Update activity log
    activityLog[today] = todayEntry;

    // Update faith points
    const currentFaithPoints = getFaithPoints();
    const newTotalPoints = currentFaithPoints.totalPoints + pointDifference;
    const levelInfo = getLevelForPoints(newTotalPoints);

    const newFaithPoints = {
      totalPoints: newTotalPoints,
      currentLevel: levelInfo.level,
      currentLevelName: levelInfo.name,
      pointsToNextLevel: levelInfo.pointsToNextLevel,
      lastUpdated: new Date().toISOString(),
    };

    // Update streak
    const currentStreakData = getStreakData();
    const newStreak = updateStreak(today, currentStreakData);

    // Capture previous streak if reset occurred
    if (currentStreakData.currentStreak > 1 && newStreak.currentStreak === 1) {
      capturePreviousStreak(currentStreakData.currentStreak);
    }

    // --- Badge integration ---
    // 1. Get current badge data
    const badgeData = getOrInitBadgeData(true);

    // 2. Determine if all 6 activities were true BEFORE this activity was set.
    // Since the idempotency check above ensures todayEntry[type] was false before
    // this call, all 6 couldn't have been true before. This flag is always false
    // here, but it's kept as a parameter to checkForNewBadges for defense-in-depth.
    const allActivitiesWereTrueBefore = false;

    // 3. Increment activity count (only for types with counters)
    let updatedBadgeData = incrementActivityCount(badgeData, type);

    // 4. Check for new badges
    const newBadgeIds = checkForNewBadges(
      {
        streak: newStreak,
        level: levelInfo.level,
        previousLevel: currentFaithPoints.currentLevel,
        todayActivities: todayEntry,
        activityCounts: updatedBadgeData.activityCounts,
        friendCount: getFriendCount(),
        allActivitiesWereTrueBefore,
      },
      updatedBadgeData.earned,
    );

    // 5. Award each new badge
    for (const badgeId of newBadgeIds) {
      updatedBadgeData = addEarnedBadge(updatedBadgeData, badgeId);
    }

    // 6. Handle Full Worship Day counter
    if (newBadgeIds.includes('full_worship_day')) {
      updatedBadgeData = {
        ...updatedBadgeData,
        activityCounts: {
          ...updatedBadgeData.activityCounts,
          fullWorshipDays: updatedBadgeData.activityCounts.fullWorshipDays + 1,
        },
      };
    }

    // 7. Persist badge data
    saveBadgeData(updatedBadgeData);

    // Persist all 3 keys (activities, faith points, streak)
    const success = persistAll(activityLog, newFaithPoints, newStreak);
    if (!success) return;

    // Update React state
    const repairInfo = getRepairData();
    setState({
      totalPoints: newTotalPoints,
      currentLevel: levelInfo.level,
      levelName: levelInfo.name,
      pointsToNextLevel: levelInfo.pointsToNextLevel,
      todayActivities: extractActivities(todayEntry),
      todayPoints: newDailyPoints,
      todayMultiplier: newMultiplier,
      currentStreak: newStreak.currentStreak,
      longestStreak: newStreak.longestStreak,
      newlyEarnedBadges: updatedBadgeData.newlyEarned,
      previousStreak: repairInfo.previousStreak,
      isFreeRepairAvailable: isFreeRepairAvailableFn(),
    });

    // Dispatch sound effect events
    window.dispatchEvent(new CustomEvent('wr:points-earned', { detail: { type, pointDifference } }));
    if (levelInfo.level > currentFaithPoints.currentLevel) {
      window.dispatchEvent(new CustomEvent('wr:level-up', { detail: { newLevel: levelInfo.level } }));
    }
  }, [isAuthenticated]);

  const clearNewlyEarnedBadges = useCallback(() => {
    if (!isAuthenticated) return;
    const badgeData = getOrInitBadgeData(true);
    const updated = clearNewlyEarnedData(badgeData);
    saveBadgeData(updated);
    setState((prev) => ({ ...prev, newlyEarnedBadges: [] }));
  }, [isAuthenticated]);

  const repairStreak = useCallback((useFreeRepair: boolean) => {
    if (!isAuthenticated) return;

    const repairData = getRepairData();
    if (repairData.previousStreak === null || repairData.previousStreak <= 1) return;

    // Defense-in-depth: validate free repair availability
    if (useFreeRepair && !isFreeRepairAvailableFn()) return;

    const today = getLocalDateString();
    const currentWeekStart = getCurrentWeekStart();

    if (!useFreeRepair) {
      // Paid repair — check points
      const currentFP = getFaithPoints();
      if (currentFP.totalPoints < 50) return;

      // Deduct 50 points
      const newTotal = currentFP.totalPoints - 50;
      const levelInfo = getLevelForPoints(newTotal);
      const newFP: FaithPointsData = {
        totalPoints: newTotal,
        currentLevel: levelInfo.level,
        currentLevelName: levelInfo.name,
        pointsToNextLevel: levelInfo.pointsToNextLevel,
        lastUpdated: new Date().toISOString(),
      };

      // Save old value for rollback if streak write fails
      const oldFaithPointsJson = localStorage.getItem('wr_faith_points');

      try {
        localStorage.setItem('wr_faith_points', JSON.stringify(newFP));
      } catch (error) { console.error('[useFaithPoints] Failed to persist faith points:', error); return; }

      // Restore streak — rollback faith points on failure
      const streak = getStreakData();
      const restoredStreak: StreakData = {
        currentStreak: repairData.previousStreak,
        longestStreak: Math.max(streak.longestStreak, repairData.previousStreak),
        lastActiveDate: today,
      };

      try {
        localStorage.setItem('wr_streak', JSON.stringify(restoredStreak));
      } catch (error) {
        console.error('[useFaithPoints] Failed to persist streak repair:', error);
        // Rollback faith points
        try {
          if (oldFaithPointsJson !== null) {
            localStorage.setItem('wr_faith_points', oldFaithPointsJson);
          } else {
            localStorage.removeItem('wr_faith_points');
          }
        } catch (rollbackError) { console.error('[useFaithPoints] Rollback failed:', rollbackError); }
        return;
      }
    } else {
      // Free repair — no points involved
      const streak = getStreakData();
      const restoredStreak: StreakData = {
        currentStreak: repairData.previousStreak,
        longestStreak: Math.max(streak.longestStreak, repairData.previousStreak),
        lastActiveDate: today,
      };

      try {
        localStorage.setItem('wr_streak', JSON.stringify(restoredStreak));
      } catch (error) { console.error('[useFaithPoints] Failed to persist free streak repair:', error); return; }
    }

    // Update repair tracking
    const updatedRepair: StreakRepairData = {
      previousStreak: null,
      lastFreeRepairDate: useFreeRepair ? today : repairData.lastFreeRepairDate,
      repairsUsedThisWeek: repairData.repairsUsedThisWeek + 1,
      weekStartDate: currentWeekStart,
    };
    saveRepairData(updatedRepair);

    // Refresh React state
    setState(loadState());
  }, [isAuthenticated]);

  // Listen for external activity recording (e.g., listen tracker)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleExternalActivity = () => {
      setState(loadState());
    };

    window.addEventListener('wr:activity-recorded', handleExternalActivity);
    return () => window.removeEventListener('wr:activity-recorded', handleExternalActivity);
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return {
      ...DEFAULT_STATE,
      recordActivity: noopRecordActivity,
      clearNewlyEarnedBadges: noopClearNewlyEarned,
      repairStreak: noopRepairStreak,
    };
  }

  return { ...state, recordActivity, clearNewlyEarnedBadges, repairStreak };
}
