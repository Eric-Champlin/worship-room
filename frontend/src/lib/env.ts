// Centralized environment variable access with typed, require-on-use helpers.
//
// Pattern: keys are OPTIONAL at module load time, so missing keys don't break
// the app for features that don't use them. Keys are REQUIRED at feature use
// time via the `require*` helpers — features that depend on a missing key
// fail loudly with a clear error message naming the variable and the file
// to set it in.
//
// Rules for this module:
// - Never log a key's value. Helpers return the string; callers pass it to
//   the intended SDK and nothing else.
// - Never expose a key beyond what's necessary for the intended API call.
// - Do not throw at module load. Load-time throws break unrelated features.
// - Add new keys here (not inline `import.meta.env.VITE_X` elsewhere) so the
//   typed require-on-use pattern is preserved as the codebase grows.
//
// Existing legacy inline `import.meta.env` reads (e.g., `api/client.ts`,
// `SEO.tsx`, `constants/audio.ts`, `components/SEO.tsx`) predate this module
// and should migrate to env.ts when those files are next touched.

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

// Note: the Google Maps API key was decommissioned from the frontend in
// Spec 3 (ai-proxy-maps). All Maps calls route through the backend proxy at
// /api/v1/proxy/maps/*; the backend holds the key. No frontend code should
// reintroduce VITE_GOOGLE_MAPS_API_KEY.

// Note: the FCBH API key was decommissioned from the frontend in Spec 4
// (ai-proxy-fcbh). All DBP calls route through the backend proxy at
// /api/v1/proxy/bible/*; the backend holds the key. No frontend code should
// reintroduce VITE_FCBH_API_KEY. Use @/services/fcbh-readiness for the
// "is FCBH available" check in UI gating.

/**
 * Returns the VAPID public key for Web Push subscriptions, or undefined if
 * not configured. Used by the subscription manager to decide whether push
 * is available in this environment.
 *
 * Used by: BB-41 (Web Push Notifications).
 */
export function getVapidPublicKey(): string | undefined {
  return VAPID_PUBLIC_KEY
}

/**
 * Returns the VAPID public key, or throws if it is not configured.
 * Call this from the subscription manager when actually creating a push
 * subscription — not at module load.
 *
 * Used by: BB-41 (Web Push Notifications).
 */
export function requireVapidPublicKey(): string {
  if (!VAPID_PUBLIC_KEY) {
    throw new Error(
      'VAPID public key is not configured. Add VITE_VAPID_PUBLIC_KEY to frontend/.env.local. ' +
        'See frontend/.env.example for a dev placeholder.',
    )
  }
  return VAPID_PUBLIC_KEY
}

/**
 * Non-throwing check for VAPID key availability — use to conditionally
 * show push notification UI elements.
 */
export function isVapidKeyConfigured(): boolean {
  return !!VAPID_PUBLIC_KEY
}

const USE_BACKEND_ACTIVITY = import.meta.env.VITE_USE_BACKEND_ACTIVITY as string | undefined

/**
 * Returns true when activity events should be dual-written to the backend
 * (POST /api/v1/activity) alongside the existing localStorage write.
 *
 * Strict equality to the string `'true'` — `'false'`, `''`, `undefined`,
 * and any other value all return false (fail-closed).
 *
 * Default: false. Cutover (flag default flip) is owned by Spec 2.9.
 *
 * Used by: useFaithPoints (Spec 2.7 — Frontend Activity Dual-Write).
 */
export function isBackendActivityEnabled(): boolean {
  return USE_BACKEND_ACTIVITY === 'true'
}

