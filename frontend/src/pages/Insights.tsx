import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { ActivityCorrelations } from '@/components/insights/ActivityCorrelations'
import { CommunityConnections } from '@/components/insights/CommunityConnections'
import { CalendarHeatmap } from '@/components/insights/CalendarHeatmap'
import { InsightCards } from '@/components/insights/InsightCards'
import { MoodTrendChart } from '@/components/insights/MoodTrendChart'
import { ScriptureConnections } from '@/components/insights/ScriptureConnections'
import { MeditationHistory } from '@/components/insights/MeditationHistory'
import { GratitudeStreak } from '@/components/insights/GratitudeStreak'
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

export function getRangeDays(range: TimeRange, entries: { date: string }[]): number {
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
                ? 'min-h-[44px] rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 motion-reduce:transition-none'
                : 'min-h-[44px] rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/60 transition-colors duration-150 hover:text-white/80 motion-reduce:transition-none'
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
      className="opacity-0 animate-fade-in motion-reduce:animate-none motion-reduce:opacity-100"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {children}
    </div>
  )
}

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
    <div className="min-h-screen bg-[#0f0a1e]">
      <a
        href="#insights-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Navbar transparent />

      {/* Page header */}
      <header className="bg-gradient-to-b from-[#1a0533] to-[#0f0a1e] pt-24 pb-6 md:pt-28 md:pb-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-white/70"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Dashboard
          </Link>
          <h1 className="font-serif text-2xl text-white/90 md:text-3xl">
            Mood Insights
          </h1>
          <p className="mt-1 text-sm text-white/60 md:text-base">
            Reflect on your journey
          </p>
        </div>
      </header>

      {/* Sentinel for sticky detection */}
      <div ref={sentinelRef} aria-hidden="true" />

      {/* Time range pills - inline */}
      <div className="bg-[#0f0a1e] py-3">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <TimeRangePills range={range} onChange={setRange} />
        </div>
      </div>

      {/* Time range pills - sticky */}
      {isSticky && (
        <div
          className="fixed top-0 left-0 right-0 z-40 border-b border-white/10 bg-[#0f0a1e]/90 py-3 backdrop-blur-sm"
          aria-hidden="true"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <TimeRangePills range={range} onChange={setRange} />
          </div>
        </div>
      )}

      {/* Content area */}
      <main
        id="insights-content"
        className="mx-auto max-w-5xl space-y-6 px-4 pb-12 sm:px-6"
      >
        {/* Insufficient data banner (1-6 entries) */}
        {entries.length > 0 && entries.length < 7 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-sm text-white/60 backdrop-blur-sm">
            After 7 days, you&apos;ll see trends emerge
          </div>
        )}

        {/* Zero-data empty state */}
        {entries.length === 0 && (
          <AnimatedSection index={0}>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-16 text-center backdrop-blur-sm">
              <p className="text-sm text-white/50">
                Start checking in to unlock your mood insights
              </p>
            </div>
          </AnimatedSection>
        )}

        {/* Charts (only when data exists) */}
        {entries.length > 0 && (
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
          <CommunityConnections hasData={hasData} />
        </AnimatedSection>
        <AnimatedSection index={entries.length > 0 ? 5 : 4}>
          <GratitudeStreak />
        </AnimatedSection>
        <AnimatedSection index={entries.length > 0 ? 6 : 5}>
          <ScriptureConnections hasData={hasData} />
        </AnimatedSection>
        <AnimatedSection index={entries.length > 0 ? 7 : 6}>
          <MeditationHistory rangeDays={rangeDays} />
        </AnimatedSection>
        <AnimatedSection index={entries.length > 0 ? 8 : 7}>
          <div className="pt-2 text-center">
            <Link
              to="/insights/monthly"
              className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
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
