/**
 * Spec 6.5 — Intercessor Timeline component.
 *
 * Mounted inside PrayerCard for prayer_request posts. Renders a single-line
 * summary that's tap-to-expand into a sorted list of recent praying reactions.
 *
 * **Privacy model (Plan-Time Divergence §1):** entries are classified
 * server-side against the viewer's friend set. Non-friend reactors render as
 * "Anonymous" with the same visual treatment as named entries — no badge,
 * no italic, no demotion (Gate-G-NO-LEADERBOARD W14).
 *
 * **Collapsed-count source:** uses `prayingCount` (live, updates immediately
 * when the viewer reacts via InteractionBar). The `initialSummary.firstThree`
 * is used for the named-entries portion of the collapsed summary line; it
 * stays at the feed-query snapshot until the user expands, at which point
 * the server-fetched `entries` replace it.
 *
 * **Anti-pressure (W14):** no clickable display-name profile links, no
 * Faithful Watcher badges, no visual differentiation of anonymous vs named
 * entries beyond the text label itself.
 */

import { useId, useMemo } from 'react'
import { ANIMATION_DURATIONS } from '@/constants/animation'
import { cn } from '@/lib/utils'
import { relativeTime } from '@/lib/relative-time'
import { formatSummaryLine } from '@/lib/intercessor-summary'
import { useIntercessors } from '@/hooks/useIntercessors'
import type { IntercessorSummary } from '@/types/intercessor'

interface IntercessorTimelineProps {
  postId: string
  /** Live praying-reaction count from the parent prayer. Always preferred over
   * `initialSummary.count` because it updates synchronously when the viewer
   * toggles their own reaction via InteractionBar (no hook plumbing needed). */
  prayingCount: number
  /** Feed-query snapshot of the first 3 entries. Used for collapsed summary
   * line only. Null on non-feed surfaces (detail, profile). */
  initialSummary?: IntercessorSummary | null
}

const EMPTY_FIRST_THREE: IntercessorSummary['firstThree'] = []

export function IntercessorTimeline({
  postId,
  prayingCount,
  initialSummary,
}: IntercessorTimelineProps) {
  const {
    entries,
    totalCount,
    expanded,
    loading,
    expand,
    collapse,
  } = useIntercessors(postId)

  const summaryCount = expanded ? totalCount : prayingCount
  const summaryFirstThree = expanded
    ? entries.slice(0, 3)
    : (initialSummary?.firstThree ?? EMPTY_FIRST_THREE)

  const summaryLine = useMemo(
    () => formatSummaryLine(summaryCount, summaryFirstThree),
    [summaryCount, summaryFirstThree],
  )

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
        onClick={() => (expanded ? collapse() : void expand())}
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
      <div
        id={regionId}
        className={cn(
          'overflow-hidden ease-[cubic-bezier(0.4,0,0.2,1)] transition-[max-height]',
          expanded ? 'max-h-[3000px]' : 'max-h-0',
        )}
        style={{ transitionDuration: `${ANIMATION_DURATIONS.base}ms` }}
        aria-hidden={!expanded}
      >
        {loading && (
          <p className="py-2 text-sm text-white/40" role="status">
            Loading…
          </p>
        )}
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
