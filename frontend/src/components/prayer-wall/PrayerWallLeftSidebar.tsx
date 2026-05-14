import { Link, useLocation } from 'react-router-dom'
import { Book, Calendar, Heart, Music, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CategoryFilters } from '@/components/prayer-wall/CategoryFilters'
import { isNavActive } from '@/components/Navbar'
import type { PrayerCategory } from '@/constants/prayer-categories'
import type { PostType } from '@/constants/post-types'

const NAV_LINKS = [
  { label: 'Daily Hub', to: '/daily', icon: Calendar },
  { label: 'Study Bible', to: '/bible', icon: Book },
  { label: 'Grow', to: '/grow', icon: TrendingUp },
  { label: 'Music', to: '/music', icon: Music },
  { label: 'Prayer Wall', to: '/prayer-wall', icon: Heart },
] as const

interface PrayerWallLeftSidebarProps {
  activeCategory: PrayerCategory | null
  activePostType: PostType | null
  onSelectCategory: (c: PrayerCategory | null) => void
  onSelectPostType: (t: PostType | null) => void
}

/**
 * Prayer Wall Redesign (2026-05-13) — left sidebar (desktop only) composing
 * primary nav (intentional duplication of Navbar links per brief Section 6 R2)
 * + CategoryFilters in desktop stacked variant.
 */
export function PrayerWallLeftSidebar({
  activeCategory,
  activePostType,
  onSelectCategory,
  onSelectPostType,
}: PrayerWallLeftSidebarProps) {
  const location = useLocation()
  return (
    <aside
      aria-label="Prayer Wall primary navigation"
      className="sticky top-16 self-start max-h-[calc(100vh-4rem)] overflow-y-auto px-2 py-4"
    >
      <nav
        aria-label="Primary navigation"
        className="flex flex-col gap-1 pb-4 border-b border-white/[0.12]"
      >
        {NAV_LINKS.map(({ label, to, icon: Icon }) => {
          const active = isNavActive(to, location.pathname)
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium min-h-[44px] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                active
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/[0.06] hover:text-white',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden xl:inline">{label}</span>
            </Link>
          )
        })}
      </nav>
      {/* CategoryFilters only renders at xl+ where the 240px column has room
          for the stacked text list. At md-xl the column is 64px (icon-only nav
          rail) and the horizontal category-filter row in the main column
          handles filter UI instead — see Plan-Time Divergence #7 in the plan. */}
      <div className="hidden pt-4 xl:block">
        <CategoryFilters
          variant="desktop"
          activeCategory={activeCategory}
          activePostType={activePostType}
          onSelectCategory={onSelectCategory}
          onSelectPostType={onSelectPostType}
        />
      </div>
    </aside>
  )
}
