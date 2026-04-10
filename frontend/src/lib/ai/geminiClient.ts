import { GoogleGenAI } from '@google/genai'
import { requireGeminiApiKey } from '@/lib/env'
import {
  EXPLAIN_PASSAGE_SYSTEM_PROMPT,
  buildExplainPassageUserPrompt,
} from '@/lib/ai/prompts/explainPassagePrompt'
import {
  GeminiApiError,
  GeminiKeyMissingError,
  GeminiNetworkError,
  GeminiSafetyBlockError,
  GeminiTimeoutError,
} from '@/lib/ai/errors'

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
 */
export function __resetGeminiClientForTests(): void {
  client = null
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
  const ai = getClient() // throws GeminiKeyMissingError if key not set

  const userPrompt = buildExplainPassageUserPrompt(reference, verseText)
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  // Compose the caller's signal with the internal timeout signal. Whichever
  // aborts first wins. If the caller didn't pass a signal, use the timeout
  // signal alone (preserves pre-fix behavior).
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal

  let response
  try {
    response = await ai.models.generateContent({
      model: MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: EXPLAIN_PASSAGE_SYSTEM_PROMPT,
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
    // user's POV (e.g., the internal timeout signal reported via AbortError
    // on some SDK paths).
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

  // Safety block detection — belt-and-suspenders, check three places:
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

  return { content, model: MODEL }
}
