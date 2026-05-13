/**
 * Spec 6.5 — Intercessor Timeline component (presentational).
 *
 * Mounted inside PrayerCard for prayer_request posts. Renders a single-line
 * summary that's tap-to-expand into a sorted list of recent praying reactions.
 *
 * **Presentational only.** The owning `useIntercessors` hook lives in
 * `PrayerCard` so that the `InteractionBar` (mounted under `PrayerCard`'s
 * `{children}` slot) can fire optimistic updates through the shared
 * `IntercessorActionsContext`. This component takes the hook result as
 * props and renders.
 *
 * **Privacy model (Plan-Time Divergence §1):** entries are classified
 * server-side against the viewer's friend set. Non-friend reactors render as
 * "Anonymous" with the same visual treatment as named entries — no badge,
 * no italic, no demotion (Gate-G-NO-LEADERBOARD W14).
 *
 * **Live count source:** `totalCount` from the hook is the unified count.
 * It starts at the parent-provided `initialCount` (prayer.prayingCount),
 * tracks parent updates while collapsed, is replaced by server-truth on
 * expand, and is adjusted by the viewer's own optimistic toggles via
 * `InteractionBar` → `IntercessorActionsContext` → hook.
 *
 * **Anti-pressure (W14):** no clickable display-name profile links, no
 * Faithful Watcher badges, no visual differentiation of anonymous vs named
 * entries beyond the text label itself.
 */

import { useId } from 'react'
import { ANIMATION_DURATIONS } from '@/constants/animation'
import { cn } from '@/lib/utils'
import { relativeTime } from '@/lib/relative-time'
import { formatSummaryLine } from '@/lib/intercessor-summary'
import type {
  IntercessorEntry,
  IntercessorSummary,
} from '@/types/intercessor'

interface IntercessorTimelineProps {
  /** Feed-query snapshot of the first 3 entries. Used for the collapsed
   *  summary line only; expanded view uses server-fetched `entries`. Null on
   *  non-feed surfaces (detail, profile) where the inline summary isn't
   *  populated. */
  initialSummary?: IntercessorSummary | null
  /** Server-fetched timeline entries (populated by expand). */
  entries: IntercessorEntry[]
  /** Live count — unified across collapsed and expanded states. */
  totalCount: number
  expanded: boolean
  loading: boolean
  /** Fetch error message, or null. Surfaced inline below the summary so the
   *  user knows a tap-to-expand failed and can retry. */
  error: string | null
  onExpand: () => void
  onCollapse: () => void
}

export function IntercessorTimeline({
  initialSummary,
  entries,
  totalCount,
  expanded,
  loading,
  error,
  onExpand,
  onCollapse,
}: IntercessorTimelineProps) {
  // Unified count source — see useIntercessors.ts doc-block.
  const summaryCount = totalCount

  // When expanded, the server-fetched entries are authoritative for the
  // names rendered. When collapsed, fall back to the feed-query snapshot.
  const summaryFirstThree = expanded
    ? entries.slice(0, 3)
    : (initialSummary?.firstThree ?? [])

  // Plain function call — formatSummaryLine is a cheap string concat, so
  // memoization on an unstable `entries.slice(0,3)` reference produced no
  // wins. Just compute every render.
  const summaryLine = formatSummaryLine(summaryCount, summaryFirstThree)

  const regionId = useId()
  const canExpand = summaryCount >= 2

  if (!canExpand) {
    return (
      <p
        data-testid="intercessor-timeline"
        className="mt-2 font-serif text-sm italic text-white/55"
      >
        {summaryLine}
      </p>
    )
  }

  const overflow = totalCount > 50 ? totalCount - 50 : 0

  return (
    <div data-testid="intercessor-timeline" className="mt-2">
      <button
        type="button"
        onClick={() => (expanded ? onCollapse() : onExpand())}
        aria-expanded={expanded}
        aria-controls={regionId}
        aria-label={
          expanded
            ? `${summaryCount} people praying. Tap to collapse list.`
            : `${summaryCount} people praying. ${summaryLine}. Tap to expand list.`
        }
        className="flex min-h-[44px] items-center text-left font-serif text-sm italic text-white/55 hover:text-white/70 focus-visible:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-white/50"
      >
        {summaryLine}
      </button>
      {/* Loading + error live OUTSIDE the aria-hidden expand region so
          the user sees feedback during the fetch (loading=true is reached
          before expanded=true). aria-live="polite" announces the loading
          to screen readers without interrupting. */}
      {loading && (
        <p
          className="mt-1 py-1 text-sm text-white/40"
          role="status"
          aria-live="polite"
        >
          Loading…
        </p>
      )}
      {error && !loading && (
        <p
          role="alert"
          className="mt-1 text-xs text-red-100/80"
        >
          We couldn't load the full list. Tap again to retry.
        </p>
      )}
      <div
        id={regionId}
        className={cn(
          'overflow-hidden ease-[cubic-bezier(0.4,0,0.2,1)] transition-[max-height]',
          expanded ? 'max-h-[3000px]' : 'max-h-0',
        )}
        style={{ transitionDuration: `${ANIMATION_DURATIONS.base}ms` }}
        aria-hidden={!expanded}
      >
        {!loading && expanded && (
          <ul role="list" className="mt-2 space-y-1.5">
            {entries.map((entry, idx) => (
              <li
                key={entry.isAnonymous ? `anon-${idx}` : entry.userId}
                role="listitem"
                className="flex items-center gap-2 text-sm text-white/65"
              >
                <span>{entry.displayName}</span>
                <span aria-hidden="true" className="text-white/30">
                  ·
                </span>
                <span className="text-white/45">
                  {relativeTime(new Date(entry.reactedAt))}
                </span>
              </li>
            ))}
            {overflow > 0 && (
              <li role="listitem" className="text-sm italic text-white/45">
                and {overflow} other{overflow === 1 ? '' : 's'}
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}
