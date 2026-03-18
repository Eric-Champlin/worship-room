import { useMemo } from 'react'
import type { MilestoneEvent, MilestoneEventType } from '@/types/dashboard'
import { getMilestoneFeed, saveMilestoneFeed } from '@/services/social-storage'
import { createMockMilestoneEvents } from '@/mocks/social-mock-data'
import { timeAgo } from '@/lib/time'
import { splitDisplayName } from '@/components/friends/utils'

interface MilestoneFeedProps {
  maxItems?: number
}

function formatMilestone(event: MilestoneEvent): string {
  const name = event.displayName
  switch (event.type) {
    case 'streak_milestone':
      return `${name} hit a ${event.detail}-day streak!`
    case 'level_up':
      return `${name} leveled up to ${event.detail}!`
    case 'badge_earned':
      return `${name} earned ${event.detail}!`
    case 'points_milestone':
      return `${name} reached ${event.detail} Faith Points!`
    default:
      return `${name} achieved a milestone!`
  }
}

function getInitials(displayName: string): string {
  const { first, last } = splitDisplayName(displayName)
  return `${first.charAt(0)}${last.charAt(0)}`
}

export function MilestoneFeed({ maxItems = 3 }: MilestoneFeedProps) {
  const events = useMemo(() => {
    let feed = getMilestoneFeed()
    if (feed.length === 0) {
      // Seed with mock data on first load
      const mockEvents = createMockMilestoneEvents()
      saveMilestoneFeed(mockEvents)
      feed = mockEvents
    }
    // Sort by timestamp descending (most recent first)
    return [...feed]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, maxItems)
  }, [maxItems])

  if (events.length === 0) return null

  return (
    <ol className="space-y-1.5" aria-label="Friend milestones">
      {events.map((event, index) => {
        const delay = Math.min(index * 100, 500)
        return (
          <li
            key={event.id}
            className="flex items-start gap-2 motion-safe:opacity-0 motion-safe:animate-fade-in"
            style={{ animationDelay: `${delay}ms`, animationDuration: '300ms' }}
          >
            <div
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/40 text-[10px] font-semibold text-white"
              aria-hidden="true"
            >
              {getInitials(event.displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/60">{formatMilestone(event)}</p>
              <p className="text-xs text-white/40">{timeAgo(event.timestamp)}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
