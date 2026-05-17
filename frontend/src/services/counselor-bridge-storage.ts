/**
 * Spec 7.5 — Counselor bridge dismissal storage.
 *
 * Mirrors the session-scoped dismissal pattern from welcome-back-storage.ts
 * and surprise-storage.ts. Once dismissed, the bridge stays hidden for the
 * remainder of the browser session (sessionStorage clears on tab close).
 *
 * The key is wr_counselor_bridge_dismissed and intentionally describes the
 * bridge (the surfaced offering), NOT the category that triggers it (Mental
 * Health), per Gate-G-MH-OMISSION-RESPECTED in the spec.
 */

const SESSION_KEY = 'wr_counselor_bridge_dismissed'

/**
 * Returns true if the bridge should be shown — i.e., it has NOT been
 * dismissed in the current browser session.
 */
export function shouldShowCounselorBridge(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) !== 'true'
  } catch {
    // sessionStorage unavailable (private mode, quota, security) — fail open
    // (show the bridge). Same posture as welcome-back-storage.ts.
    return true
  }
}

/**
 * Mark the bridge as dismissed for this session. Idempotent.
 */
export function markCounselorBridgeDismissed(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, 'true')
  } catch {
    // Silently fail — acceptable per existing pattern. Worst case: bridge
    // re-appears on next category toggle within the same session.
  }
}
