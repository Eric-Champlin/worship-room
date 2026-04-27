import type {
  MilestoneEvent,
  NotificationEntry,
  Nudge,
  SocialInteractionsData,
} from '@/types/dashboard';
import { getLocalDateString, getCurrentWeekStart } from '@/utils/date';
import {
  MAX_ENCOURAGEMENTS_PER_FRIEND_PER_DAY,
  NUDGE_COOLDOWN_DAYS,
  MILESTONE_FEED_CAP,
} from '@/constants/dashboard/encouragements';

export const SOCIAL_KEY = 'wr_social_interactions';
export const MILESTONE_KEY = 'wr_milestone_feed';
export const NOTIFICATIONS_KEY = 'wr_notifications';

// Always return a freshly-allocated object with freshly-allocated arrays.
// A module-level singleton + shallow spread (`{ ...SINGLETON }`) reuses the
// inner array references — callers that push into the returned arrays mutate
// the singleton, leaking state across calls (and across tests).
function emptySocialData(): SocialInteractionsData {
  return {
    encouragements: [],
    nudges: [],
    recapDismissals: [],
  };
}

export function getSocialInteractions(): SocialInteractionsData {
  try {
    const raw = localStorage.getItem(SOCIAL_KEY);
    if (!raw) return emptySocialData();
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      !Array.isArray(parsed.encouragements) ||
      !Array.isArray(parsed.nudges) ||
      !Array.isArray(parsed.recapDismissals)
    ) {
      return emptySocialData();
    }
    return parsed as SocialInteractionsData;
  } catch (_e) {
    // localStorage may be unavailable or data malformed
    return emptySocialData();
  }
}

export function saveSocialInteractions(data: SocialInteractionsData): void {
  localStorage.setItem(SOCIAL_KEY, JSON.stringify(data));
}

export function getMilestoneFeed(): MilestoneEvent[] {
  try {
    const raw = localStorage.getItem(MILESTONE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as MilestoneEvent[];
  } catch (_e) {
    // localStorage may be unavailable or data malformed
    return [];
  }
}

export function saveMilestoneFeed(events: MilestoneEvent[]): void {
  // Enforce FIFO cap — keep most recent events
  const capped = events.length > MILESTONE_FEED_CAP
    ? events.slice(events.length - MILESTONE_FEED_CAP)
    : events;
  localStorage.setItem(MILESTONE_KEY, JSON.stringify(capped));
}

export function getEncouragementCountToday(fromUserId: string, toUserId: string): number {
  const data = getSocialInteractions();
  const todayStr = getLocalDateString();
  return data.encouragements.filter(
    (e) =>
      e.fromUserId === fromUserId &&
      e.toUserId === toUserId &&
      getLocalDateString(new Date(e.timestamp)) === todayStr,
  ).length;
}

export function canEncourage(fromUserId: string, toUserId: string): boolean {
  return getEncouragementCountToday(fromUserId, toUserId) < MAX_ENCOURAGEMENTS_PER_FRIEND_PER_DAY;
}

export function getLastNudge(fromUserId: string, toUserId: string): Nudge | undefined {
  const data = getSocialInteractions();
  const nudges = data.nudges
    .filter((n) => n.fromUserId === fromUserId && n.toUserId === toUserId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return nudges[0];
}

export function canNudge(fromUserId: string, toUserId: string): boolean {
  const lastNudge = getLastNudge(fromUserId, toUserId);
  if (!lastNudge) return true;
  const daysSinceNudge =
    (Date.now() - new Date(lastNudge.timestamp).getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceNudge >= NUDGE_COOLDOWN_DAYS;
}

export function isRecapDismissedThisWeek(): boolean {
  const data = getSocialInteractions();
  const currentWeekStart = getCurrentWeekStart();
  return data.recapDismissals.includes(currentWeekStart);
}

export function addNotification(
  entry: Omit<NotificationEntry, 'id' | 'timestamp' | 'read'>,
): void {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    const existing: NotificationEntry[] = raw ? JSON.parse(raw) : [];
    const notification: NotificationEntry = {
      ...entry,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    existing.push(notification);
    const capped = existing.length > 50 ? existing.slice(-50) : existing;
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(capped));
  } catch (_e) {
    // Gracefully handle corrupted data — start fresh
    const notification: NotificationEntry = {
      ...entry,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify([notification]));
  }
}
