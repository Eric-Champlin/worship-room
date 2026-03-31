import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Users, Heart } from 'lucide-react'
import { getActivityItems, AVATAR_COLORS } from '@/data/challenge-community-feed'

interface CommunityFeedProps {
  dayNumber: number
  challengeDuration: number
}

export function CommunityFeed({ dayNumber, challengeDuration }: CommunityFeedProps) {
  const items = useMemo(
    () => getActivityItems(dayNumber, challengeDuration, 6),
    [dayNumber, challengeDuration],
  )

  return (
    <section className="border-t border-white/10 py-8 sm:py-10">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-white/60" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-white">Challenge Community</h3>
        </div>
        <ul className="divide-y divide-white/5">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-3 py-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: AVATAR_COLORS[item.colorIndex] }}
                aria-hidden="true"
              >
                {item.initials}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-white/90">{item.name}</span>{' '}
                <span className="text-sm text-white/60">{item.action}</span>
              </div>
              <span className="shrink-0 text-xs text-white/60">{item.timestamp}</span>
            </li>
          ))}
        </ul>
        <Link
          to="/prayer-wall?filter=challenge"
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5"
        >
          <Heart className="h-4 w-4" aria-hidden="true" />
          Pray for the community
        </Link>
      </div>
    </section>
  )
}
