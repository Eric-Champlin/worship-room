import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, X } from 'lucide-react'
import { useLiturgicalSeason } from '@/hooks/useLiturgicalSeason'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { LiturgicalSeasonId } from '@/constants/liturgical-calendar'

const SEASON_MESSAGES: Partial<Record<LiturgicalSeasonId, string>> = {
  advent: "It's Advent — a season of waiting and hope",
  christmas: 'Merry Christmas — celebrate the gift of Emmanuel',
  lent: "It's Lent — a season of reflection and renewal",
  'holy-week': "It's Holy Week — a season of sacrifice and redemption",
  easter: 'He is risen! — celebrate the joy of Easter',
  pentecost: "It's Pentecost — the Spirit is moving",
}

function getDismissKey(seasonId: string): string {
  return `wr_seasonal_banner_dismissed_${seasonId}`
}

export function SeasonalBanner() {
  const { isNamedSeason, currentSeason } = useLiturgicalSeason()
  const prefersReduced = useReducedMotion()
  const seasonId = currentSeason.id

  const [dismissed, setDismissed] = useState(() => {
    if (!isNamedSeason) return true
    try {
      return localStorage.getItem(getDismissKey(seasonId)) === 'true'
    } catch {
      return false
    }
  })
  const [hiding, setHiding] = useState(false)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    }
  }, [])

  const handleDismiss = useCallback(() => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    if (prefersReduced) {
      try { localStorage.setItem(getDismissKey(seasonId), 'true') } catch { /* noop */ }
      setDismissed(true)
      return
    }
    setHiding(true)
    dismissTimerRef.current = setTimeout(() => {
      try { localStorage.setItem(getDismissKey(seasonId), 'true') } catch { /* noop */ }
      setDismissed(true)
    }, 200)
  }, [prefersReduced, seasonId])

  if (!isNamedSeason || dismissed) return null

  const message =
    SEASON_MESSAGES[seasonId as LiturgicalSeasonId] ??
    `It's ${currentSeason.name} — a season of ${currentSeason.themeWord}`

  return (
    <div
      className="w-full"
      style={{
        maxHeight: hiding ? 0 : 200,
        opacity: hiding ? 0 : 1,
        overflow: 'hidden',
        transition: prefersReduced
          ? 'none'
          : 'max-height 200ms ease-out, opacity 200ms ease-out',
      }}
      role="complementary"
      aria-label="Seasonal announcement"
    >
      <div className="relative flex items-center justify-center rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 px-4 py-2 sm:px-6">
        {/* Mobile: wrap-friendly layout */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 pr-10 sm:pr-12">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-white/40" aria-hidden="true" />
            <span className="text-sm text-white/70">{message}</span>
          </div>
          <span className="hidden text-white/40 sm:inline" aria-hidden="true">&middot;</span>
          <Link
            to="/daily?tab=devotional"
            className="text-sm font-medium text-primary-lt transition-colors hover:text-primary"
          >
            Read today&apos;s devotional &rarr;
          </Link>
        </div>

        {/* Dismiss button — absolute right to avoid layout shifts */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full text-white/50 transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:right-4"
          aria-label="Dismiss seasonal banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
