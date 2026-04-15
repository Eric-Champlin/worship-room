/**
 * BB-26 — AudioPlayerSheet
 *
 * The non-modal bottom sheet wrapper. Renders null when the player's
 * sheetState is 'closed' — the sheet is absent from the DOM entirely.
 *
 * Mounted at the App level (Step 15) inside AudioPlayerProvider so it
 * survives BibleReader route changes (BB-29 continuous playback).
 *
 * Inner content (expanded vs minimized) is lazy-loaded via Suspense so
 * the heavy player JSX stays out of the main bundle.
 *
 * Wraps children in ErrorBoundary — if either inner component crashes,
 * the fallback shows a small "Audio unavailable right now" card.
 */

import { Suspense, lazy } from 'react'
import { cn } from '@/lib/utils'
import { useAudioPlayer } from '@/hooks/audio/useAudioPlayer'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ANIMATION_DURATIONS, ANIMATION_EASINGS } from '@/constants/animation'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const AudioPlayerExpanded = lazy(() =>
  import('./AudioPlayerExpanded').then((m) => ({ default: m.AudioPlayerExpanded })),
)
const AudioPlayerMini = lazy(() =>
  import('./AudioPlayerMini').then((m) => ({ default: m.AudioPlayerMini })),
)

const SHEET_BASE_CLASSES =
  'fixed inset-x-0 bottom-0 z-40 bg-[#0D0620]/95 backdrop-blur-xl border-t border-white/10 lg:max-w-2xl lg:mx-auto lg:rounded-t-2xl'

function SheetFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(SHEET_BASE_CLASSES, 'px-6 py-4 text-center')}
    >
      <p className="text-sm text-white/70">Audio unavailable right now</p>
    </div>
  )
}

export function AudioPlayerSheet() {
  const { state } = useAudioPlayer()
  const reducedMotion = useReducedMotion()

  // Sheet is absent from DOM when closed (spec requirement)
  if (state.sheetState === 'closed') return null

  const isExpanded = state.sheetState === 'expanded'
  const slideDurationMs = reducedMotion ? 0 : ANIMATION_DURATIONS.base

  return (
    <ErrorBoundary fallback={<SheetFallback />}>
      <div
        role="region"
        aria-label={isExpanded ? 'Audio player' : 'Minimized audio player'}
        className={SHEET_BASE_CLASSES}
        style={{
          transition: `height ${slideDurationMs}ms ${ANIMATION_EASINGS.decelerate}`,
        }}
      >
        <Suspense fallback={<SheetFallback />}>
          {isExpanded ? <AudioPlayerExpanded /> : <AudioPlayerMini />}
        </Suspense>
      </div>
    </ErrorBoundary>
  )
}
