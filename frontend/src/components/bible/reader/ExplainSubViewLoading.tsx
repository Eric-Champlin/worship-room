import { useReducedMotion } from '@/hooks/useReducedMotion'

/**
 * Loading state shown while the Gemini request is in flight. Respects
 * prefers-reduced-motion — renders a static label without the pulsing skeleton
 * bars when reduced motion is enabled.
 *
 * Follows the CrossRefsSubView loading-state pattern (centered vertically,
 * muted label, no chrome).
 */
export function ExplainSubViewLoading() {
  const reducedMotion = useReducedMotion()

  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-12 text-center"
      role="status"
      aria-live="polite"
    >
      <p className="mb-4 text-sm text-white/50">Thinking…</p>
      {!reducedMotion && (
        <div className="w-full max-w-xs space-y-2" aria-hidden="true">
          <div className="h-3 w-full animate-pulse rounded bg-white/[0.08]" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-white/[0.08]" />
          <div className="h-3 w-4/6 animate-pulse rounded bg-white/[0.08]" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-white/[0.08]" />
        </div>
      )}
    </div>
  )
}
