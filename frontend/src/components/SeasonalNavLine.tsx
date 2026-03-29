import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Star, Gift, Sparkles, Heart, Cross, Sun, Flame, Leaf, X,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import { useLiturgicalSeason } from '@/hooks/useLiturgicalSeason'

export const SEASON_ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  Star, Gift, Sparkles, Heart, Cross, Sun, Flame, Leaf,
}

export function SeasonalNavLine() {
  const { isNamedSeason, seasonName, icon, currentSeason } = useLiturgicalSeason()
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem('wr_seasonal_nav_dismissed') === 'true' }
    catch (_e) { return false }
  })

  if (!isNamedSeason || dismissed) return null

  const SeasonIcon = SEASON_ICON_MAP[icon]

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-1.5 text-xs text-white/40">
      {SeasonIcon && <SeasonIcon className="h-3 w-3" aria-hidden="true" />}
      <span>It&apos;s {seasonName} — a season of {currentSeason.themeWord}</span>
      <Link to="/daily?tab=devotional" className="text-primary-lt hover:underline">
        Read today&apos;s devotional
      </Link>
      <button
        type="button"
        onClick={() => {
          try { sessionStorage.setItem('wr_seasonal_nav_dismissed', 'true') }
          catch (_e) { /* sessionStorage unavailable */ }
          setDismissed(true)
        }}
        className="ml-1 rounded-full p-1 text-white/30 hover:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        aria-label="Dismiss seasonal message"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
