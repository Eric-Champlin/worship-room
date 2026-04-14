import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { SiteFooter } from '@/components/SiteFooter'
import { ActivityCorrelations } from '@/components/insights/ActivityCorrelations'
import { CommunityConnections } from '@/components/insights/CommunityConnections'
import { CalendarHeatmap } from '@/components/insights/CalendarHeatmap'
import { InsightCards } from '@/components/insights/InsightCards'
import { MoodTrendChart } from '@/components/insights/MoodTrendChart'
import { ScriptureConnections } from '@/components/insights/ScriptureConnections'
import { MeditationHistory } from '@/components/insights/MeditationHistory'
import { GratitudeStreak } from '@/components/insights/GratitudeStreak'
import { GratitudeCorrelationCard } from '@/components/insights/GratitudeCorrelationCard'
import { PrayerLifeSection } from '@/components/insights/PrayerLifeSection'
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'
import { SEO } from '@/components/SEO'
import { INSIGHTS_METADATA } from '@/lib/seo/routeMetadata'
import { DevAuthToggle } from '@/components/dev/DevAuthToggle'
import { useAuth } from '@/hooks/useAuth'
import { getMoodEntries } from '@/services/mood-storage'
import { getLocalDateString } from '@/utils/date'

export type TimeRange = '30d' | '90d' | '180d' | '1y' | 'all'

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '180d', label: '180d' },
  { value: '1y', label: '1y' },
  { value: 'all', label: 'All' },
]

function getRangeDays(range: TimeRange, entries: { date: string }[]): number {
  switch (range) {
    case '30d':
      return 30
    case '90d':
      return 90
    case '180d':
      return 180
    case '1y':
      return 365
    case 'all': {
      if (entries.length === 0) return 30
      const today = new Date()
      const todayStr = getLocalDateString(today)
      const earliest = entries.reduce(
        (min, e) => (e.date < min ? e.date : min),
        todayStr,
      )
      const earliestDate = new Date(earliest + 'T12:00:00')
      const diffMs = today.getTime() - earliestDate.getTime()
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      return Math.max(diffDays, 30)
    }
  }
}

function TimeRangePills({
  range,
  onChange,
}: {
  range: TimeRange
  onChange: (r: TimeRange) => void
}) {
  const pillRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIndex = TIME_RANGE_OPTIONS.findIndex((o) => o.value === range)
      let nextIndex = currentIndex

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        nextIndex = (currentIndex + 1) % TIME_RANGE_OPTIONS.length
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        nextIndex =
          (currentIndex - 1 + TIME_RANGE_OPTIONS.length) %
          TIME_RANGE_OPTIONS.length
      } else if (e.key === 'Home') {
        e.preventDefault()
        nextIndex = 0
      } else if (e.key === 'End') {
        e.preventDefault()
        nextIndex = TIME_RANGE_OPTIONS.length - 1
      } else {
        return
      }

      onChange(TIME_RANGE_OPTIONS[nextIndex].value)
      pillRefs.current[nextIndex]?.focus()
    },
    [range, onChange],
  )

  return (
    <div
      role="radiogroup"
      aria-label="Time range"
      className="flex items-center justify-center gap-2"
      onKeyDown={handleKeyDown}
    >
      {TIME_RANGE_OPTIONS.map((option, i) => {
        const selected = option.value === range
        return (
          <button
            key={option.value}
            ref={(el) => {
              pillRefs.current[i] = el
            }}
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={
              selected
                ? 'min-h-[44px] rounded-full bg-primary/20 px-4 py-2 text-sm font-medium text-primary-lt transition-colors duration-fast motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70'
                : 'min-h-[44px] rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/60 transition-colors duration-fast hover:text-white/80 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70'
            }
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function AnimatedSection({
  index,
  children,
}: {
  index: number
  children: React.ReactNode
}) {
  return (
    <div
      className="opacity-0 animate-fade-in-up motion-reduce:animate-none motion-reduce:opacity-100"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {children}
    </div>
  )
}

// Loading state: use InsightsSkeleton
export function Insights() {
  const { isAuthenticated } = useAuth()
  const [range, setRange] = useState<TimeRange>('30d')
  const [isSticky, setIsSticky] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const entries = getMoodEntries()
  const hasData = entries.length > 0
  const rangeDays = getRangeDays(range, entries)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting)
      },
      { threshold: 0 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-dashboard-dark">
      <SEO {...INSIGHTS_METADATA} />
      <Navbar transparent />

      {/* Hero section */}
      <section
        aria-labelledby="insights-heading"
        className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
        style={ATMOSPHERIC_HERO_BG}
      >
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Dashboard
        </Link>
        <h1
          id="insights-heading"
          className="mb-3 px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl"
          style={GRADIENT_TEXT_STYLE}
        >
          Mood <span className="font-script">Insights</span>
        </h1>
        <p className="font-serif italic text-base text-white/60 sm:text-lg">
          Reflect on your journey
        </p>
      </section>

      {/* Sentinel for sticky detection */}
      <div ref={sentinelRef} aria-hidden="true" />

      {/* Time range pills - inline */}
      <div className="bg-dashboard-dark py-3">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <TimeRangePills range={range} onChange={setRange} />
        </div>
      </div>

      {/* Time range pills - sticky */}
      {isSticky && (
        <div
          className="fixed top-0 left-0 right-0 z-40 border-b border-white/10 bg-white/[0.08] py-3 backdrop-blur-xl"
          aria-hidden="true"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <TimeRangePills range={range} onChange={setRange} />
          </div>
        </div>
      )}

      {/* Content area */}
      <main
        id="main-content"
        className="mx-auto max-w-5xl space-y-6 px-4 pb-12 sm:px-6"
      >
        {/* Insufficient data banner (2-6 entries) */}
        {entries.length >= 2 && entries.length < 7 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-sm text-white/60 backdrop-blur-sm">
            After 7 days, you&apos;ll see trends emerge
          </div>
        )}

        {/* Empty state (0-1 entries) */}
        {entries.length < 2 && (
          <AnimatedSection index={0}>
            <FeatureEmptyState
              icon={BarChart3}
              heading="Your story is just beginning"
              description="Check in with your mood each day, and watch your journey unfold here."
              ctaLabel="Check in now"
              ctaHref="/"
            />
          </AnimatedSection>
        )}

        {/* Charts (only when 2+ entries exist) */}
        {entries.length >= 2 && (
          <>
            <AnimatedSection index={0}>
              <CalendarHeatmap rangeDays={rangeDays} />
            </AnimatedSection>
            <AnimatedSection index={1}>
              <MoodTrendChart rangeDays={rangeDays} />
            </AnimatedSection>
          </>
        )}

        <AnimatedSection index={entries.length > 0 ? 2 : 1}>
          <InsightCards hasData={hasData} />
        </AnimatedSection>
        <AnimatedSection index={entries.length > 0 ? 3 : 2}>
          <ActivityCorrelations hasData={hasData} />
        </AnimatedSection>
        <AnimatedSection index={entries.length > 0 ? 4 : 3}>
          <GratitudeCorrelationCard />
        </AnimatedSection>
        <AnimatedSection index={entries.length > 0 ? 5 : 4}>
          <CommunityConnections hasData={hasData} />
        </AnimatedSection>
        <AnimatedSection index={entries.length > 0 ? 6 : 5}>
          <GratitudeStreak />
        </AnimatedSection>
        <AnimatedSection index={entries.length > 0 ? 7 : 6}>
          <ScriptureConnections hasData={hasData} />
        </AnimatedSection>
        <AnimatedSection index={entries.length > 0 ? 8 : 7}>
          <PrayerLifeSection />
        </AnimatedSection>
        <AnimatedSection index={entries.length > 0 ? 9 : 8}>
          <MeditationHistory rangeDays={rangeDays} />
        </AnimatedSection>
        <AnimatedSection index={entries.length > 0 ? 10 : 9}>
          <div className="pt-2 text-center">
            <Link
              to="/insights/monthly"
              className="inline-flex min-h-[44px] items-center rounded-lg bg-white/10 px-6 py-3 font-semibold text-white/70 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
            >
              View Monthly Report
            </Link>
          </div>
        </AnimatedSection>
      </main>

      <SiteFooter />
      {import.meta.env.DEV && <DevAuthToggle />}
    </div>
  )
}
