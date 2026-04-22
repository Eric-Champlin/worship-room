// One-time backend readiness probe for the FCBH proxy. Called by the
// AudioPlayButton to decide whether to render the play affordance without
// needing the FCBH API key on the client. Mirrors the Spec 3 maps-readiness
// pattern with one structural difference: unconditional caching (success OR
// failure). The trade-off vs maps-readiness's cache-on-success-only:
// - FCBH readiness is a dev-environment concern (localhost missing the env
//   var). In that scenario the button should stay hidden for the session;
//   retrying every render would spam /api/v1/health with identical 404s.
// - A transient network blip at the first probe DOES pin the session to
//   "unavailable" until refresh — acceptable given the BB-26 silent-fallback
//   UX (no user-visible error, just no play button).
//
// Resolves to the cached boolean after the first probe; concurrent callers
// share a single in-flight request via the promise cache (thundering-herd
// prevention).

let cachedReadiness: boolean | undefined
let inflightProbe: Promise<boolean> | undefined

const HEALTH_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1/health`

async function probe(): Promise<boolean> {
  try {
    const response = await fetch(HEALTH_URL, { method: 'GET' })
    if (!response.ok) return false
    const body = (await response.json()) as {
      providers?: { fcbh?: { configured?: boolean } }
    }
    return body?.providers?.fcbh?.configured === true
  } catch {
    return false
  }
}

/**
 * Returns true if the backend reports FCBH as configured. Cached in memory
 * for the session after the first probe (success OR failure). Returns false
 * on any failure mode (health endpoint down, malformed response,
 * fcbh.configured missing or not literally `true`).
 */
export async function getFcbhReadiness(): Promise<boolean> {
  if (cachedReadiness !== undefined) return cachedReadiness
  if (inflightProbe) return inflightProbe
  inflightProbe = probe().then((result) => {
    cachedReadiness = result
    inflightProbe = undefined
    return result
  })
  return inflightProbe
}

/** Test-only helper to clear the readiness cache between tests. */
export function resetFcbhReadinessCache(): void {
  cachedReadiness = undefined
  inflightProbe = undefined
}
