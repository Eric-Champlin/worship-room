import { useCallback, useEffect, useRef, useState } from 'react'
import { generateReflection, type ReflectResult } from '@/lib/ai/geminiClient'
import {
  GeminiApiError,
  GeminiKeyMissingError,
  GeminiNetworkError,
  GeminiSafetyBlockError,
  GeminiTimeoutError,
} from '@/lib/ai/errors'

export type ReflectErrorKind =
  | 'network'
  | 'api'
  | 'safety'
  | 'timeout'
  | 'unavailable'

export interface ReflectState {
  status: 'loading' | 'success' | 'error'
  result: ReflectResult | null
  errorKind: ReflectErrorKind | null
  errorMessage: string | null
}

/**
 * User-facing copy for each error kind. Copied verbatim from
 * `useExplainPassage` — uniform copy across both hooks for the initial ship.
 * The spec §"Error states" explicitly allows this; BB-32 can parameterize
 * per-feature copy if real usage reveals confusion. Do NOT paraphrase.
 */
const ERROR_COPY: Record<ReflectErrorKind, string> = {
  network:
    "Couldn't load an explanation right now. Check your connection and try again.",
  api: 'This feature is temporarily unavailable. Try again in a few minutes.',
  safety:
    'This passage is too difficult for our AI helper to explain well. Consider reading a scholarly commentary or asking a trusted teacher.',
  timeout: 'The request took too long. Try again in a moment.',
  unavailable: 'This feature is temporarily unavailable. Try again in a few minutes.',
}

function classifyError(err: unknown): ReflectErrorKind {
  if (err instanceof GeminiSafetyBlockError) return 'safety'
  if (err instanceof GeminiTimeoutError) return 'timeout'
  if (err instanceof GeminiNetworkError) return 'network'
  // Key-missing is mapped to the generic 'unavailable' message for users —
  // the specific error is logged to the console for developers in the client.
  if (err instanceof GeminiKeyMissingError) return 'unavailable'
  if (err instanceof GeminiApiError) return 'api'
  return 'unavailable'
}

/**
 * React hook that fetches a contemplative reflection for a scripture passage
 * via the Gemini client. Fires on mount, re-fires when reference/verseText
 * change or when `retry()` is called. Guards against setState on unmounted
 * components.
 *
 * Structurally identical to `useExplainPassage` — only the generator function
 * and the type names differ. Parallel implementation per BB-31 spec.
 *
 * No caching, no backend proxy, no streaming — per spec.
 */
export function useReflectOnPassage(
  reference: string,
  verseText: string,
): ReflectState & { retry: () => void } {
  const [state, setState] = useState<ReflectState>({
    status: 'loading',
    result: null,
    errorKind: null,
    errorMessage: null,
  })

  // Bumped by retry() to force the request effect to re-run
  const [attempt, setAttempt] = useState(0)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    // Guard: skip the fetch when either argument is empty. Callers
    // (ReflectSubView's 20-verse cap) pass empty strings to keep the hook
    // call unconditional without actually making a request. The hook stays
    // in `loading` state — the caller overrides the status via its own
    // effective-status logic.
    if (!reference || !verseText) return

    // Create a per-effect AbortController. React StrictMode mounts the
    // component twice in dev (mount → unmount → remount); the cleanup
    // function below aborts the first effect's request so only the second
    // request survives. In production, the controller also aborts when the
    // user navigates away mid-request or when `retry()` re-fires the effect.
    const controller = new AbortController()

    setState({ status: 'loading', result: null, errorKind: null, errorMessage: null })

    // Defer the actual request start by one microtask tick. This is
    // load-bearing for StrictMode correctness: the Gemini SDK dispatches
    // its fetch() synchronously inside generateContent(), so if we called
    // generateReflection() directly here, the HTTP POST would hit the wire
    // BEFORE React runs the cleanup from the first StrictMode mount. The
    // subsequent controller.abort() can only tell the browser to ignore the
    // response — the server has already processed the request and billed
    // the API call. By deferring via queueMicrotask, the abort from the
    // first cleanup runs before any microtask executes, so the first
    // request's `signal.aborted` check bails out before it ever calls the
    // SDK. Only the second (surviving) mount's request actually fires.
    queueMicrotask(() => {
      if (controller.signal.aborted) return
      generateReflection(reference, verseText, controller.signal)
        .then((result) => {
          if (!isMountedRef.current) return
          setState({
            status: 'success',
            result,
            errorKind: null,
            errorMessage: null,
          })
        })
        .catch((err: unknown) => {
          // User-driven abort (unmount, re-fire, retry): silently discard.
          // The component that initiated this request is gone — there is no
          // one to show an error to, and the replacement effect has already
          // issued a fresh request. Do NOT transition to an error state.
          if (err instanceof Error && err.name === 'AbortError') return
          if (!isMountedRef.current) return
          const kind = classifyError(err)
          setState({
            status: 'error',
            result: null,
            errorKind: kind,
            errorMessage: ERROR_COPY[kind],
          })
        })
    })

    return () => {
      controller.abort()
    }
  }, [reference, verseText, attempt])

  const retry = useCallback(() => {
    setAttempt((n) => n + 1)
  }, [])

  return { ...state, retry }
}
