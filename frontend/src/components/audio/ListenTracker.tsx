import { useListenTracker } from '@/hooks/useListenTracker';

/**
 * Renderless component that tracks 30-second continuous audio playback
 * and records the "listen" faith points activity.
 *
 * Reads auth state directly from localStorage rather than useAuth() context,
 * because AudioProvider may render before AuthProvider in some test setups.
 *
 * TODO: Replace readAuthFromStorage() with useAuth() when real JWT auth is implemented (Phase 3).
 */
export function ListenTracker() {
  const isAuthenticated = readAuthFromStorage();
  useListenTracker(isAuthenticated);
  return null;
}

function readAuthFromStorage(): boolean {
  try {
    return localStorage.getItem('wr_auth_simulated') === 'true';
  } catch {
    return false;
  }
}
