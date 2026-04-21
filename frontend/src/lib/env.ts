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
// Normalize empty-string env to undefined so `!FCBH_API_KEY` is a clean
// "absent" check regardless of whether the var is missing or set to "".
const FCBH_API_KEY_RAW = import.meta.env.VITE_FCBH_API_KEY as string | undefined
const FCBH_API_KEY: string | undefined = FCBH_API_KEY_RAW || undefined

// Note: the Google Maps API key was decommissioned from the frontend in
// Spec 3 (ai-proxy-maps). All Maps calls route through the backend proxy at
// /api/v1/proxy/maps/*; the backend holds the key. No frontend code should
// reintroduce VITE_GOOGLE_MAPS_API_KEY.

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

/**
 * Returns the FCBH Digital Bible Platform v4 API key, or throws if it is
 * not configured. Call this from the DBP client right before making a
 * network request — never at module load or from feature code that runs
 * for users who haven't hit the audio feature yet.
 *
 * Used by: BB-26 (FCBH Audio Bible Integration), BB-27 through BB-29 and
 * BB-44 which build on BB-26's DBP client.
 */
export function requireFcbhApiKey(): string {
  if (!FCBH_API_KEY) {
    throw new Error(
      'FCBH API key is not configured. Add VITE_FCBH_API_KEY to frontend/.env.local. ' +
        'See frontend/.env.example for the expected format.',
    )
  }
  return FCBH_API_KEY
}

/**
 * No-throw variant — returns the FCBH API key or undefined. Used by the
 * audio cache layer so it can short-circuit without throwing when the key
 * is absent (e.g., in tests).
 */
export function getFcbhApiKey(): string | undefined {
  return FCBH_API_KEY
}

/**
 * Non-throwing check for FCBH key availability — use to conditionally
 * show the audio play button in BibleReader chrome.
 */
export function isFcbhApiKeyConfigured(): boolean {
  return !!FCBH_API_KEY
}
