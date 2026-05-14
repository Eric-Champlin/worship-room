import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  ANSWERED_NAV_TAB_ALL,
  ANSWERED_NAV_TAB_ANSWERED,
} from '@/constants/answered-wall-copy'

interface PrayerWallViewTab {
  label: string
  to: string
}

const TABS: ReadonlyArray<PrayerWallViewTab> = [
  { label: ANSWERED_NAV_TAB_ALL, to: '/prayer-wall' },
  { label: ANSWERED_NAV_TAB_ANSWERED, to: '/prayer-wall/answered' },
]

/**
 * Spec 6.6 — cross-navigation tab strip between the main Prayer Wall feed
 * and the Answered Wall. Placed at the top of the main column on both pages
 * (Plan-Time Divergence #2) — `PrayerWallLeftSidebar` is `xl:block` only, so
 * a tab strip there would be invisible on mobile.
 *
 * Reuses the canonical pill+halo tab-bar pattern from `09-design-system.md`
 * § "Active-State and Selection Patterns" (same as DailyHub, Music, Local
 * Support, Grow). Uses `aria-current="page"` per WAI-ARIA — this is route
 * navigation, NOT a toggle, so `aria-pressed` would be wrong.
 */
export function PrayerWallViewTabs() {
  const location = useLocation()
  return (
    <nav
      aria-label="Prayer Wall views"
      className="mx-auto flex w-full max-w-md rounded-full border border-white/[0.08] bg-white/[0.07] p-1 backdrop-blur-md"
    >
      {TABS.map(({ label, to }) => {
        const active = location.pathname === to
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-[44px] flex-1 items-center justify-center rounded-full px-4 py-2 text-center text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
              active
                ? 'border border-violet-400/45 bg-violet-500/[0.13] text-white shadow-[0_0_20px_rgba(139,92,246,0.18)]'
                : 'text-white/60 hover:text-white',
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
