import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { X, Star, Gift, Sparkles, Heart, Cross, Sun, Flame, Leaf } from 'lucide-react'
import { useLiturgicalSeason } from '@/hooks/useLiturgicalSeason'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { ComponentType } from 'react'

const DISMISS_KEY = 'wr_seasonal_banner_dismissed'

const SEASON_ICON_MAP: Record<string, ComponentType<{ className?: string; style?: React.CSSProperties; 'aria-hidden'?: boolean | 'true' | 'false' }>> = {
  Star, Gift, Sparkles, Heart, Cross, Sun, Flame, Leaf,
}

export function SeasonalBanner() {
  const { isNamedSeason, seasonName, themeColor, icon, currentSeason } = useLiturgicalSeason()
  const prefersReduced = useReducedMotion()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [hiding, setHiding] = useState(false)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleDismiss = useCallback(() => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    if (prefersReduced) {
      sessionStorage.setItem(DISMISS_KEY, 'true')
      setDismissed(true)
      return
    }
    setHiding(true)
    dismissTimerRef.current = setTimeout(() => {
      sessionStorage.setItem(DISMISS_KEY, 'true')
      setDismissed(true)
    }, 200)
  }, [prefersReduced])

  if (!isNamedSeason || dismissed) return null

  const SeasonIcon = SEASON_ICON_MAP[icon]

  return (
    <div
      className="relative flex w-full items-center justify-center px-4 py-2"
      style={{
        backgroundColor: `${themeColor}1A`,
        maxHeight: hiding ? 0 : 100,
        overflow: 'hidden',
        opacity: hiding ? 0 : 1,
        transition: prefersReduced ? 'none' : 'max-height 200ms ease-out, opacity 200ms ease-out',
      }}
      role="complementary"
      aria-label="Seasonal greeting"
    >
      <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-3">
        <div className="flex items-center gap-2">
          {SeasonIcon && (
            <SeasonIcon
              className="h-4 w-4"
              style={{ color: `${themeColor}B3` }}
              aria-hidden="true"
            />
          )}
          <span className="text-sm text-white/90">
            It&apos;s {seasonName} — a season of {currentSeason.themeWord}
          </span>
        </div>
        <Link
          to="/devotional"
          className="text-sm font-medium underline underline-offset-2"
          style={{ color: themeColor }}
        >
          Read today&apos;s devotional
        </Link>
      </div>
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full text-white/60 hover:text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        aria-label="Dismiss seasonal banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
