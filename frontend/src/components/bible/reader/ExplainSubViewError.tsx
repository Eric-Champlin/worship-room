import { useEffect, useState } from 'react'
import { AlertCircle, RotateCw } from 'lucide-react'
import type { ExplainErrorKind } from '@/hooks/bible/useExplainPassage'

interface ExplainSubViewErrorProps {
  kind: ExplainErrorKind
  message: string
  onRetry: () => void
  /**
   * BB-32: wall-clock seconds until a retry should be allowed. Populated
   * only when `kind === 'rate-limit'`. When present, the component
   * displays a live per-second countdown and disables the retry button
   * until the countdown reaches zero. For every other error kind this
   * prop is `undefined` and the component behaves exactly as in BB-30 /
   * BB-31.
   */
  retryAfterSeconds?: number
}

/**
 * Error state with user-facing copy and a retry button. The retry button is
 * rendered for every error kind — the spec's acceptance criteria 9 and 12
 * require retry on network and timeout failures, and surfacing retry for
 * other kinds is harmless (a transient safety block or quota issue may clear
 * on a second attempt).
 *
 * BB-32 adds one new UX path: when `kind === 'rate-limit'` and
 * `retryAfterSeconds` is provided, the message renders a live per-second
 * countdown (by substituting the `{seconds}` placeholder in the hook's
 * `ERROR_COPY` template) and the retry button is visually disabled until
 * the countdown reaches zero. The countdown is implemented entirely
 * inside this component via a local `useEffect` + `setInterval` — the
 * hook does not re-render per tick.
 *
 * `data-error-kind` is exposed so tests and `/verify-with-playwright` can
 * inspect the kind without test IDs.
 */
export function ExplainSubViewError({
  kind,
  message,
  onRetry,
  retryAfterSeconds,
}: ExplainSubViewErrorProps) {
  const isRateLimit = kind === 'rate-limit' && typeof retryAfterSeconds === 'number'

  // Local countdown state — initialized to the hook-provided value on
  // first render. For non-rate-limit errors this is always 0 and never
  // used.
  const [secondsLeft, setSecondsLeft] = useState<number>(
    isRateLimit ? (retryAfterSeconds ?? 0) : 0,
  )

  // Reset the countdown when a fresh rate-limit error arrives with a
  // different `retryAfterSeconds` (e.g., user pressed retry after the
  // previous countdown ended and the server immediately re-denied them).
  useEffect(() => {
    if (isRateLimit) {
      setSecondsLeft(retryAfterSeconds ?? 0)
    }
  }, [isRateLimit, retryAfterSeconds])

  // Per-second decrement. Runs only while rate-limited and above zero so
  // that the interval is cleaned up as soon as the countdown reaches 0 or
  // the error kind changes.
  useEffect(() => {
    if (!isRateLimit) return
    if (secondsLeft <= 0) return
    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [isRateLimit, secondsLeft])

  const isDisabled = isRateLimit && secondsLeft > 0

  // Substitute `{seconds}` in the message template for rate-limit errors.
  // For non-rate-limit kinds (or if the message doesn't contain the
  // placeholder for any reason), the message is rendered verbatim.
  const displayedMessage =
    isRateLimit && message.includes('{seconds}')
      ? message.replace('{seconds}', String(secondsLeft))
      : message

  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-12 text-center"
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle className="mb-4 h-10 w-10 text-white/20" aria-hidden="true" />
      <p className="text-sm font-medium text-white">Something went wrong</p>
      <p className="mt-1 max-w-xs text-xs text-white/50">{displayedMessage}</p>
      <button
        type="button"
        onClick={isDisabled ? undefined : onRetry}
        disabled={isDisabled}
        aria-disabled={isDisabled || undefined}
        className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium text-white transition-[colors,transform] duration-fast hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
        data-error-kind={kind}
      >
        <RotateCw className="h-4 w-4" aria-hidden="true" />
        Try again
      </button>
    </div>
  )
}
