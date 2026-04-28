import { useRef, useEffect } from 'react';
import { useAudioState } from '@/components/audio/AudioProvider';
import { getLocalDateString } from '@/utils/date';
import {
  getActivityLog,
  getFaithPoints,
  getStreakData,
  calculateDailyPoints,
  updateStreak,
  persistAll,
  freshDailyActivities,
} from '@/services/faith-points-storage';
import { getLevelForPoints } from '@/constants/dashboard/levels';
import { isBackendActivityEnabled } from '@/lib/env';
import { postActivityToBackend } from '@/services/activity-backend';

const LISTEN_THRESHOLD_MS = 30_000; // 30 seconds
const POLL_INTERVAL_MS = 5_000; // Check every 5 seconds

export function useListenTracker(isAuthenticated: boolean): void {
  const { isPlaying } = useAudioState();
  const playStartRef = useRef<number | null>(null);
  const recordedDateRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function cleanup() {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    const today = getLocalDateString();

    // Already recorded today — no need to track
    if (recordedDateRef.current === today) {
      cleanup();
      playStartRef.current = null;
      return cleanup;
    }

    if (isPlaying) {
      // Start tracking
      if (playStartRef.current === null) {
        playStartRef.current = Date.now();
      }

      intervalRef.current = setInterval(() => {
        const currentDay = getLocalDateString();

        // Daily reset: if the day rolled over, allow re-recording
        if (recordedDateRef.current !== null && recordedDateRef.current !== currentDay) {
          recordedDateRef.current = null;
        }

        // Already recorded for current day
        if (recordedDateRef.current === currentDay) {
          cleanup();
          return;
        }

        if (playStartRef.current !== null && Date.now() - playStartRef.current >= LISTEN_THRESHOLD_MS) {
          // Record listen activity directly via storage functions
          recordListenActivity(currentDay, isAuthenticated);
          recordedDateRef.current = currentDay;
          cleanup();
        }
      }, POLL_INTERVAL_MS);
    } else {
      // Paused — reset timer (not cumulative)
      playStartRef.current = null;
      cleanup();
    }

    return cleanup;
  }, [isPlaying, isAuthenticated]);
}

function recordListenActivity(today: string, isAuthenticated: boolean): void {
  if (!isAuthenticated) return;

  const activityLog = getActivityLog();
  const todayEntry = activityLog[today] ?? freshDailyActivities();

  // Already recorded
  if (todayEntry.listen) return;

  todayEntry.listen = true;

  const { points: newDailyPoints, multiplier: newMultiplier } = calculateDailyPoints(todayEntry);
  const pointDifference = newDailyPoints - todayEntry.pointsEarned;
  todayEntry.pointsEarned = newDailyPoints;
  todayEntry.multiplier = newMultiplier;

  activityLog[today] = todayEntry;

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

  const currentStreak = getStreakData();
  const newStreak = updateStreak(today, currentStreak);

  const success = persistAll(activityLog, newFaithPoints, newStreak);
  if (success) {
    // Notify other hooks (e.g., useFaithPoints on dashboard) of the state change
    window.dispatchEvent(new CustomEvent('wr:activity-recorded', { detail: { type: 'listen' } }));

    if (isBackendActivityEnabled()) {
      postActivityToBackend('listen', 'music').catch((err) => {
        console.warn('[useListenTracker] backend dual-write failed:', err);
      });
    }
  }
}
