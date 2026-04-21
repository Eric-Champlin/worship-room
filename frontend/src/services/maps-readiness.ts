// One-time backend readiness probe for the Maps proxy. Called by
// local-support-service.ts to decide between the real Google-backed service
// and the mock service.
//
// Resolves to the cached boolean after the first successful health probe;
// retries on every call after a failure. A transient network blip at page
// load should not permanently pin the session to the mock service — the
// next call gets a fresh attempt. Concurrent calls still share a single
// in-flight request via the promise cache (thundering-herd prevention).

let cachedReadiness: boolean | undefined
let inflightProbe: Promise<boolean> | undefined

const HEALTH_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1/health`

async function probe(): Promise<boolean> {
  try {
    const response = await fetch(HEALTH_URL, { method: 'GET' })
    if (!response.ok) return false
    const data = await response.json()
    return Boolean(data?.providers?.googleMaps?.configured)
  } catch {
    return false
  }
}

export async function getMapsReadiness(): Promise<boolean> {
  if (cachedReadiness !== undefined) return cachedReadiness
  if (inflightProbe) return inflightProbe
  inflightProbe = probe().then((ready) => {
    // Only cache success. A false result means the probe failed (network
    // down, non-OK status, JSON parse error) OR the backend reports Maps
    // unconfigured. Either way, the next call should try again — we'd
    // rather re-probe a few times than permanently fall back to mock.
    if (ready) cachedReadiness = ready
    inflightProbe = undefined
    return ready
  })
  return inflightProbe
}

/** Test-only reset. Used by Vitest to clear cached state between tests. */
export function __resetMapsReadinessForTests(): void {
  cachedReadiness = undefined
  inflightProbe = undefined
}
