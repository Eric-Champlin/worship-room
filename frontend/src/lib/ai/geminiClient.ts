import {
  GeminiApiError,
  GeminiNetworkError,
  GeminiSafetyBlockError,
  GeminiTimeoutError,
  RateLimitError,
} from '@/lib/ai/errors'
import {
  clearAllAICache,
  getCachedAIResult,
  setCachedAIResult,
  type AIFeature,
} from '@/lib/ai/cache'
import {
  consumeRateLimitToken,
  resetRateLimitForTests,
} from '@/lib/ai/rateLimit'

/**
 * Base URL for the backend proxy. Matches the convention established in
 * `src/api/client.ts` — VITE_API_BASE_URL or localhost:8080 as fallback.
 * The URL is resolved once at module load; changing it requires a page
 * reload, which is fine for an env-var-driven config.
 */
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  'http://localhost:8080'

const EXPLAIN_URL = `${API_BASE_URL}/api/v1/proxy/ai/explain`
const REFLECT_URL = `${API_BASE_URL}/api/v1/proxy/ai/reflect`

/**
 * Internal 30-second request timeout. Mirrors the backend's Gemini
 * timeout exactly so caller UX is consistent: if a request takes more
 * than 30 seconds, the frontend times out even when the backend would
 * have.
 */
const REQUEST_TIMEOUT_MS = 30_000

/**
 * The single return shape for `generateExplanation`. Matches the backend
 * `GeminiResponseDto`. Do NOT add a `source` field or discriminated
 * union — acceptance criterion 29 from the BB-30 spec.
 */
export interface ExplainResult {
  content: string
  model: string
}

/**
 * The return shape for `generateReflection` (BB-31). Same shape as
 * `ExplainResult` but a distinct exported type so callers are explicit
 * about which feature they're calling, and future features may extend
 * one type and not the other.
 */
export interface ReflectResult {
  content: string
  model: string
}

/**
 * Test-only hook to reset all module-level state. Preserves the contract
 * of the original SDK-based implementation: callers that reset expect a
 * clean slate. After the proxy migration there's no SDK client to null
 * out, but the cache + rate-limit helpers still hold state, so we
 * continue to clear them here.
 */
export function __resetGeminiClientForTests(): void {
  clearAllAICache()
  resetRateLimitForTests()
}

/**
 * Shape of the backend's success response body (minus the `meta` wrapper
 * which we don't need to consume here — we grab the request ID from the
 * header instead).
 */
interface ProxySuccessBody {
  data: { content: string; model: string }
  meta?: { requestId?: string }
}

/**
 * Shape of the backend's error response body (ProxyError).
 */
interface ProxyErrorBody {
  code: string
  message: string
  requestId?: string
  timestamp?: string
}

/**
 * Shared helper wrapping cache + rate-limit + backend fetch. Composition
 * order preserved from the pre-migration implementation:
 *
 *   1. Cache lookup — synchronous, returns WITHOUT consuming a
 *      rate-limit token and WITHOUT calling the backend.
 *   2. Rate-limit check — consumes one token if allowed, throws
 *      RateLimitError BEFORE the fetch if denied.
 *   3. Fetch to backend /api/v1/proxy/ai/{endpoint}.
 *   4. Response mapping — success → cache + return, error → typed throw.
 *
 * The backend already handles safety detection and timeout — the client
 * simply maps backend error codes to the existing frontend error
 * classes.
 */
async function callProxy(
  feature: AIFeature,
  url: string,
  reference: string,
  verseText: string,
  signal?: AbortSignal,
): Promise<{ content: string; model: string }> {
  // 1. Cache lookup — no rate-limit consumption, no network call
  const cached = getCachedAIResult(feature, reference, verseText)
  if (cached) return cached

  // 2. Rate-limit check — denial throws BEFORE any network work
  const decision = consumeRateLimitToken(feature)
  if (!decision.allowed) {
    throw new RateLimitError(decision.retryAfterSeconds)
  }

  // 3. Compose abort signals — caller's optional signal + internal timeout
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal

  // 4. Fetch to backend
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference, verseText }),
      signal: combinedSignal,
    })
  } catch (err) {
    // Caller-driven abort: re-throw AbortError unchanged so the hook can
    // silently discard. The caller is gone — no one to show an error to.
    if (signal?.aborted && err instanceof Error && err.name === 'AbortError') {
      throw err
    }
    // Internal timeout (AbortSignal.timeout fires with name 'TimeoutError')
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new GeminiTimeoutError(undefined, { cause: err })
    }
    // Any other AbortError source = also a timeout from the user's POV
    if (err instanceof Error && err.name === 'AbortError') {
      throw new GeminiTimeoutError('AI request was aborted', { cause: err })
    }
    // Network failures — fetch throws TypeError for DNS, connection,
    // CORS, or offline. Also catch any network-ish error messages as a
    // defensive catch-all.
    if (
      err instanceof TypeError ||
      (err instanceof Error && /network|fetch|offline/i.test(err.message))
    ) {
      throw new GeminiNetworkError(undefined, { cause: err })
    }
    // Anything else surfaces as a generic API error.
    throw new GeminiApiError(
      err instanceof Error ? err.message : 'Unknown AI proxy error',
      { cause: err },
    )
  }

  // 5. Success path (HTTP 2xx)
  if (response.ok) {
    let body: ProxySuccessBody
    try {
      body = (await response.json()) as ProxySuccessBody
    } catch (err) {
      throw new GeminiApiError('AI proxy returned a malformed response', {
        cause: err,
      })
    }
    if (!body?.data?.content || !body?.data?.model) {
      throw new GeminiApiError('AI proxy returned an incomplete response')
    }
    const result = { content: body.data.content, model: body.data.model }
    // Cache writes are fire-and-forget — storage failure degrades silently.
    setCachedAIResult(feature, reference, verseText, result)
    return result
  }

  // 6. Error path (HTTP 4xx/5xx) — parse ProxyError body and map to
  //    the appropriate typed error class.
  let errorBody: ProxyErrorBody | null = null
  try {
    errorBody = (await response.json()) as ProxyErrorBody
  } catch {
    // Ignore — errorBody stays null
  }

  const code = errorBody?.code ?? ''
  const message = errorBody?.message ?? `AI proxy returned HTTP ${response.status}`

  switch (code) {
    case 'RATE_LIMITED': {
      // Backend rate limit. Read Retry-After header (integer seconds).
      const retryAfterHeader = response.headers.get('Retry-After')
      const retryAfterSeconds = retryAfterHeader
        ? Math.max(1, parseInt(retryAfterHeader, 10) || 1)
        : 60
      throw new RateLimitError(retryAfterSeconds)
    }
    case 'SAFETY_BLOCK':
      throw new GeminiSafetyBlockError(message)
    case 'UPSTREAM_TIMEOUT':
      throw new GeminiTimeoutError(message)
    case 'UPSTREAM_ERROR':
    case 'INVALID_INPUT':
    case 'INTERNAL_ERROR':
      throw new GeminiApiError(message)
    default:
      throw new GeminiApiError(message)
  }
}

/**
 * Generate a scholarly explanation for a scripture passage via the
 * backend AI proxy. Public signature unchanged from the pre-migration
 * SDK-based implementation — callers (`useExplainPassage`) do not need
 * to change.
 *
 * @param reference Formatted reference, e.g. "1 Corinthians 13:4-7"
 * @param verseText The WEB translation text for the referenced range
 * @param signal Optional caller-provided AbortSignal. When fired, the
 *   in-flight fetch is cancelled and the original AbortError is re-thrown
 *   unchanged so the caller can detect it via `err.name === 'AbortError'`
 *   and silently discard.
 */
export async function generateExplanation(
  reference: string,
  verseText: string,
  signal?: AbortSignal,
): Promise<ExplainResult> {
  return callProxy('explain', EXPLAIN_URL, reference, verseText, signal)
}

/**
 * Generate a contemplative reflection for a scripture passage via the
 * backend AI proxy. Public signature unchanged.
 */
export async function generateReflection(
  reference: string,
  verseText: string,
  signal?: AbortSignal,
): Promise<ReflectResult> {
  return callProxy('reflect', REFLECT_URL, reference, verseText, signal)
}
