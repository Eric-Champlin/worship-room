import { useState } from 'react';
import { useListenTracker } from '@/hooks/useListenTracker';

/**
 * Renderless component that tracks 30-second continuous audio playback
 * and records the "listen" faith points activity.
 *
 * Reads auth state directly from localStorage rather than useAuth() context,
 * because AudioProvider may render before AuthProvider in some test setups.
 *
 * TODO(Phase 3+): After Spec 1.9 (Frontend AuthContext JWT Migration), this
 * bypass still works because:
 *   (1) Legacy mock users: `wr_auth_simulated` is written by WelcomeWizard
 *       via simulateLegacyAuth(), so readAuthFromStorage() returns true.
 *   (2) Real JWT users: AuthContext's `mirrorToLegacyKeys` helper writes
 *       `wr_auth_simulated='true'` on login/register/boot-hydration so this
 *       component still sees them as authenticated. Marked "Transitional —
 *       removed in Phase 2 cutover" in AuthContext.tsx.
 * A future test-suite-migration spec will refactor this component to use
 * useAuth() once AudioProvider<>AuthProvider render order is audit-safe
 * across all test setups. Fixing it now would require wrapping every
 * AudioProvider-using test in AuthProvider — scope explosion for 1.9.
 */
export function ListenTracker() {
  const [isAuthenticated] = useState(readAuthFromStorage);
  useListenTracker(isAuthenticated);
  return null;
}

function readAuthFromStorage(): boolean {
  try {
    return localStorage.getItem('wr_auth_simulated') === 'true';
  } catch (_e) {
    return false;
  }
}
