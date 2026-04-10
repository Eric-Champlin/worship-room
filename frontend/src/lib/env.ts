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

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as
  | string
  | undefined

/**
 * Returns the Google Gemini API key, or throws if it is not configured.
 *
 * Call this from the feature code that actually sends a Gemini request. Do
 * NOT call it at module load or from feature code that may run for users who
 * have not opted into the Gemini-backed feature.
 *
 * Used by: BB-30 (Explain This Passage), BB-31 (What does this mean for me),
 * future Ask AI migration.
 */
export function requireGeminiApiKey(): string {
  if (!GEMINI_API_KEY) {
    throw new Error(
      'Gemini API key is not configured. Add VITE_GEMINI_API_KEY to frontend/.env.local. ' +
        'See frontend/.env.example for the expected format.',
    )
  }
  return GEMINI_API_KEY
}

/**
 * Returns the Google Maps Platform API key, or throws if it is not
 * configured. Call this from the feature code that actually loads the Maps
 * SDK or sends a Places/Geocoding request.
 *
 * Used by: future Local Support feature (churches, counselors, Celebrate
 * Recovery locators).
 */
export function requireGoogleMapsApiKey(): string {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error(
      'Google Maps API key is not configured. Add VITE_GOOGLE_MAPS_API_KEY to frontend/.env.local. ' +
        'See frontend/.env.example for the expected format.',
    )
  }
  return GOOGLE_MAPS_API_KEY
}

/**
 * Non-throwing check — use in UI that wants to conditionally render a feature
 * based on whether its key is configured (e.g., hide an "Explain this passage"
 * affordance in environments where Gemini is not wired up).
 */
export function isGeminiApiKeyConfigured(): boolean {
  return !!GEMINI_API_KEY
}

/**
 * Non-throwing check — symmetric with `isGeminiApiKeyConfigured` for the Maps
 * key.
 */
export function isGoogleMapsApiKeyConfigured(): boolean {
  return !!GOOGLE_MAPS_API_KEY
}
