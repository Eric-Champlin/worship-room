import type { LeaderboardEntry } from '@/types/dashboard';
import { MOCK_GLOBAL_LEADERBOARD } from '@/mocks/leaderboard-mock-data';

export const LEADERBOARD_KEY = 'wr_leaderboard_global';

export function getGlobalLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return initializeGlobalLeaderboard();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return initializeGlobalLeaderboard();
    return parsed;
  } catch {
    return initializeGlobalLeaderboard();
  }
}

function initializeGlobalLeaderboard(): LeaderboardEntry[] {
  const data = [...MOCK_GLOBAL_LEADERBOARD];
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(data));
  return data;
}
