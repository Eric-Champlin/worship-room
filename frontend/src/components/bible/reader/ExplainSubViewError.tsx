import { AlertCircle, RotateCw } from 'lucide-react'
import type { ExplainErrorKind } from '@/hooks/bible/useExplainPassage'

interface ExplainSubViewErrorProps {
  kind: ExplainErrorKind
  message: string
  onRetry: () => void
}

/**
 * Error state with user-facing copy and a retry button. The retry button is
 * rendered for every error kind — the spec's acceptance criteria 9 and 12
 * require retry on network and timeout failures, and surfacing retry for
 * other kinds is harmless (a transient safety block or quota issue may clear
 * on a second attempt).
 *
 * `data-error-kind` is exposed so tests and `/verify-with-playwright` can
 * inspect the kind without test IDs.
 */
export function ExplainSubViewError({
  kind,
  message,
  onRetry,
}: ExplainSubViewErrorProps) {
  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-12 text-center"
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle className="mb-4 h-10 w-10 text-white/20" aria-hidden="true" />
      <p className="text-sm font-medium text-white">Something went wrong</p>
      <p className="mt-1 max-w-xs text-xs text-white/50">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        data-error-kind={kind}
      >
        <RotateCw className="h-4 w-4" aria-hidden="true" />
        Try again
      </button>
    </div>
  )
}
