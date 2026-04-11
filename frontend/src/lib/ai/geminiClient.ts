import { GoogleGenAI } from '@google/genai'
import { requireGeminiApiKey } from '@/lib/env'
import {
  EXPLAIN_PASSAGE_SYSTEM_PROMPT,
  buildExplainPassageUserPrompt,
} from '@/lib/ai/prompts/explainPassagePrompt'
import {
  REFLECT_PASSAGE_SYSTEM_PROMPT,
  buildReflectPassageUserPrompt,
} from '@/lib/ai/prompts/reflectPassagePrompt'
import {
  GeminiApiError,
  GeminiKeyMissingError,
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
 * The Gemini model used for BB-30 "Explain this passage".
 *
 * `gemini-2.5-flash-lite` is hardcoded here (not passed by callers) because
 * every request in this feature uses the same model. Rationale:
 *
 * - Flash-Lite is the cheapest 2.5-family model (~$0.10/M input, ~$0.40/M
 *   output). Per-request cost is ~$0.0002, a thousand requests ~$0.20.
 * - gemini-2.0-flash-lite is deprecated (scheduled removal June 2026).
 * - gemini-2.5-flash and 2.5-pro are 3-6x more expensive; Flash-Lite is
 *   adequate for this scholarly-explanation task.
 *
 * Model string verified against live Gemini docs on 2026-04-10.
 * See https://ai.google.dev/gemini-api/docs/models for the canonical list.
 */
const MODEL = 'gemini-2.5-flash-lite'

const REQUEST_TIMEOUT_MS = 30_000
const MAX_OUTPUT_TOKENS = 600
const TEMPERATURE = 0.7

/**
 * The single return shape for `generateExplanation`. No discriminated union,
 * no `source` field — acceptance criterion 29.
 */
export interface ExplainResult {
  content: string
  model: string
}

/**
 * The return shape for `generateReflection` (BB-31). Same shape as
 * `ExplainResult` but a distinct exported type so callers are explicit about
 * which feature they're calling, and future features may extend one type and
 * not the other.
 */
export interface ReflectResult {
  content: string
  model: string
}

/**
 * Lazily initialized SDK client. Initializing at module load would throw for
 * users without a configured key, defeating the require-on-use pattern in
 * `env.ts`. First call to `generateExplanation` constructs the client;
 * subsequent calls reuse the memoized instance.
 */
let client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (client) return client

  let apiKey: string
  try {
    apiKey = requireGeminiApiKey()
  } catch (err) {
    console.error(
      '[BB-30] Gemini key missing. Add VITE_GEMINI_API_KEY to frontend/.env.local. ' +
        'See frontend/.env.example for the expected format.',
      err,
    )
    throw new GeminiKeyMissingError(undefined, { cause: err })
  }

  client = new GoogleGenAI({ apiKey })
  return client
}

/**
 * Test-only hook to reset the memoized client between tests. Never called
 * from production code — exported solely for the unit test suite.
 *
 * BB-32 extension: also clears the BB-32 cache and rate-limit state. This
 * keeps the "full module reset" contract intact — callers that reset the
 * client expect a clean slate, and BB-32 added transitive module-level
 * state (cache writes in localStorage, in-memory rate-limit buckets) that
 * would otherwise leak across tests. The existing `geminiClient.test.ts`
 * beforeEach ALSO calls `clearAllAICache()` + `resetRateLimitForTests()`
 * directly as belt-and-suspenders — but a mid-test call to
 * `__resetGeminiClientForTests` (e.g., in the "reuses the client
 * (memoized)" regression test) needs this extension to keep the existing
 * assertion `GoogleGenAI.toHaveBeenCalledTimes(2)` passing after the
 * cache layer was introduced.
 */
export function __resetGeminiClientForTests(): void {
  client = null
  clearAllAICache()
  resetRateLimitForTests()
}

/**
 * BB-32 — Shared helper that wraps a Gemini call with cache and rate-limit
 * layers. Both `generateExplanation` and `generateReflection` route through
 * this helper so the cache + rate-limit logic lives in exactly one place.
 *
 * The composition order is load-bearing:
 *   1. Cache lookup — synchronous, returns a hit WITHOUT consuming a
 *      rate-limit token and WITHOUT calling the SDK. This is the most
 *      important property of BB-32: repeated requests for the same passage
 *      are completely free.
 *   2. Rate-limit check — consumes one token if allowed, throws
 *      `RateLimitError` BEFORE the SDK is called if denied.
 *   3. SDK call with the existing abort-signal composition and error
 *      mapping preserved verbatim from BB-30/BB-31.
 *   4. Safety-block detection (three-path check preserved verbatim).
 *   5. On success: cache the result and return it. On any error: do NOT
 *      cache — retrying after a transient failure should fire a fresh
 *      request, not return the old failure for 7 days.
 *
 * The function signature keeps `feature`, `systemPrompt`, and
 * `buildUserPrompt` injected by the caller so Explain and Reflect can
 * share this helper without cross-contaminating their prompts.
 */
async function generateWithPromptAndCacheAndRateLimit(
  feature: AIFeature,
  systemPrompt: string,
  reference: string,
  verseText: string,
  buildUserPrompt: (ref: string, text: string) => string,
  signal?: AbortSignal,
): Promise<{ content: string; model: string }> {
  // 1. Cache lookup — no rate-limit consumption, no API call
  const cached = getCachedAIResult(feature, reference, verseText)
  if (cached) return cached

  // 2. Rate-limit check — denial throws BEFORE any SDK work
  const decision = consumeRateLimitToken(feature)
  if (!decision.allowed) {
    throw new RateLimitError(decision.retryAfterSeconds)
  }

  // 3. Lazy SDK client — preserves all existing key-missing semantics
  const ai = getClient()

  // 4. Build the user prompt via the caller-provided builder
  const userPrompt = buildUserPrompt(reference, verseText)

  // 5. Compose abort signals — caller's optional signal + internal timeout
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal

  // 6. SDK call + error mapping — preserved verbatim from BB-30/BB-31
  let response
  try {
    response = await ai.models.generateContent({
      model: MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: TEMPERATURE,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        abortSignal: combinedSignal,
      },
    })
  } catch (err) {
    // Caller-driven abort: re-throw the original AbortError unchanged so the
    // hook can detect it and silently discard (the component is unmounting or
    // a replacement request is already in flight — there is no one to show
    // an error to). Do NOT wrap as GeminiTimeoutError.
    if (signal?.aborted && err instanceof Error && err.name === 'AbortError') {
      throw err
    }
    // Internal timeout signal: AbortSignal.timeout fires a DOMException with
    // name 'TimeoutError' (distinct from 'AbortError').
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new GeminiTimeoutError(undefined, { cause: err })
    }
    // Any other AbortError source is also surfaced as a timeout from the
    // user's POV.
    if (err instanceof Error && err.name === 'AbortError') {
      throw new GeminiTimeoutError('Gemini request was aborted', { cause: err })
    }
    // Network failures — TypeError from fetch, or errors with network-ish messages
    if (
      err instanceof TypeError ||
      (err instanceof Error && /network|fetch|offline/i.test(err.message))
    ) {
      throw new GeminiNetworkError(undefined, { cause: err })
    }
    // Everything else — invalid key, quota, 5xx, malformed response, unknown
    throw new GeminiApiError(
      err instanceof Error ? err.message : 'Unknown Gemini API error',
      { cause: err },
    )
  }

  // 7. Safety block detection — belt-and-suspenders, check three places:
  //   1. Prompt-level block:    response.promptFeedback?.blockReason
  //   2. Output-level block:    candidates[0]?.finishReason === 'SAFETY'
  //   3. Silent block (empty):  response.text is empty/whitespace
  const promptBlockReason = response.promptFeedback?.blockReason
  if (promptBlockReason) {
    throw new GeminiSafetyBlockError(
      `Gemini blocked the prompt: ${promptBlockReason}`,
    )
  }

  const firstCandidate = response.candidates?.[0]
  const finishReason = firstCandidate?.finishReason
  if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT') {
    throw new GeminiSafetyBlockError(
      `Gemini blocked the response: finishReason=${finishReason}`,
    )
  }

  const content = response.text?.trim()
  if (!content) {
    throw new GeminiSafetyBlockError(
      'Gemini returned an empty response (likely a silent safety block)',
    )
  }

  // 8. Build the result and cache it. Cache writes are fire-and-forget —
  //    any storage failure (quota, private browsing, disabled) degrades
  //    silently to no-cache behavior inside the cache module.
  const result = { content, model: MODEL }
  setCachedAIResult(feature, reference, verseText, result)
  return result
}

/**
 * Generate a scholarly explanation for a scripture passage using Gemini.
 *
 * The system prompt is routed through `config.systemInstruction` (the
 * Gemini-specific pattern) — it is NOT prepended to `contents`. The user
 * prompt (reference + verse text) is the only value passed as `contents`.
 *
 * @param reference Formatted reference, e.g. "1 Corinthians 13:4-7"
 * @param verseText The WEB translation text for the referenced range
 * @param signal Optional caller-provided AbortSignal. When fired (e.g., from
 *   a React effect cleanup on unmount or re-fire), the in-flight request is
 *   cancelled and the original AbortError is re-thrown unchanged so the
 *   caller can detect it via `err.name === 'AbortError'` and silently
 *   discard. This composes with the internal 30-second timeout signal via
 *   `AbortSignal.any`, so whichever fires first wins.
 * @returns ExplainResult with the LLM-generated content and model identifier
 * @throws GeminiKeyMissingError when VITE_GEMINI_API_KEY is not set
 * @throws GeminiNetworkError for offline/DNS/fetch-level failures
 * @throws GeminiApiError for non-success API responses (invalid key, quota, 5xx)
 * @throws GeminiSafetyBlockError when Gemini's safety filter blocked the output
 * @throws GeminiTimeoutError when the request exceeded 30 seconds
 * @throws DOMException/AbortError (unwrapped) when the caller's `signal` aborted
 */
export async function generateExplanation(
  reference: string,
  verseText: string,
  signal?: AbortSignal,
): Promise<ExplainResult> {
  return generateWithPromptAndCacheAndRateLimit(
    'explain',
    EXPLAIN_PASSAGE_SYSTEM_PROMPT,
    reference,
    verseText,
    buildExplainPassageUserPrompt,
    signal,
  )
}

/**
 * Generate a contemplative reflection for a scripture passage using Gemini.
 *
 * Where `generateExplanation` offers scholarly context, `generateReflection`
 * offers the reader a small set of genuine questions and possibilities about
 * how the passage might land today. It shares the same SDK client singleton,
 * model, timeout behavior, and error classification as `generateExplanation`
 * — the only difference is that it passes BB-31's system prompt (not BB-30's)
 * via `config.systemInstruction`.
 *
 * The system prompt is routed through `config.systemInstruction` (the
 * Gemini-specific pattern) — it is NOT prepended to `contents`. The user
 * prompt (reference + verse text) is the only value passed as `contents`.
 *
 * @param reference Formatted reference, e.g. "Philippians 4:6-7"
 * @param verseText The WEB translation text for the referenced range
 * @param signal Optional caller-provided AbortSignal. When fired (e.g., from
 *   a React effect cleanup on unmount or re-fire), the in-flight request is
 *   cancelled and the original AbortError is re-thrown unchanged so the
 *   caller can detect it via `err.name === 'AbortError'` and silently
 *   discard. This composes with the internal 30-second timeout signal via
 *   `AbortSignal.any`, so whichever fires first wins.
 * @returns ReflectResult with the LLM-generated content and model identifier
 * @throws GeminiKeyMissingError when VITE_GEMINI_API_KEY is not set
 * @throws GeminiNetworkError for offline/DNS/fetch-level failures
 * @throws GeminiApiError for non-success API responses (invalid key, quota, 5xx)
 * @throws GeminiSafetyBlockError when Gemini's safety filter blocked the output
 * @throws GeminiTimeoutError when the request exceeded 30 seconds
 * @throws DOMException/AbortError (unwrapped) when the caller's `signal` aborted
 */
export async function generateReflection(
  reference: string,
  verseText: string,
  signal?: AbortSignal,
): Promise<ReflectResult> {
  return generateWithPromptAndCacheAndRateLimit(
    'reflect',
    REFLECT_PASSAGE_SYSTEM_PROMPT,
    reference,
    verseText,
    buildReflectPassageUserPrompt,
    signal,
  )
}
