import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getLocalDateString } from '@/utils/date';
import { getMoodEntries } from '@/services/mood-storage';
import {
  getActivityLog,
  getFaithPoints,
  getStreakData,
  calculateDailyPoints,
  updateStreak,
  persistAll,
  freshDailyActivities,
  freshFaithPoints,
  freshStreakData,
} from '@/services/faith-points-storage';
import { getLevelForPoints } from '@/constants/dashboard/levels';
import type { ActivityType, DailyActivities } from '@/types/dashboard';

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
}

const DEFAULT_STATE: FaithPointsState = {
  totalPoints: 0,
  currentLevel: 1,
  levelName: 'Seedling',
  pointsToNextLevel: 100,
  todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, meditate: false, journal: false },
  todayPoints: 0,
  todayMultiplier: 1,
  currentStreak: 0,
  longestStreak: 0,
};

function extractActivities(da: DailyActivities): Record<ActivityType, boolean> {
  return {
    mood: da.mood,
    pray: da.pray,
    listen: da.listen,
    prayerWall: da.prayerWall,
    meditate: da.meditate,
    journal: da.journal,
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
  };
}

const noopRecordActivity = () => {};

export function useFaithPoints() {
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
    const currentStreak = getStreakData();
    const newStreak = updateStreak(today, currentStreak);

    // Persist all 3 keys
    const success = persistAll(activityLog, newFaithPoints, newStreak);
    if (!success) return;

    // Update React state
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
    });
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
    return { ...DEFAULT_STATE, recordActivity: noopRecordActivity };
  }

  return { ...state, recordActivity };
}
