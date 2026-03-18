import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { DevAuthToggle } from '@/components/dev/DevAuthToggle'
import { useAuth } from '@/hooks/useAuth'
import {
  useMonthlyReportData,
  getDefaultMonth,
  getEarliestMonth,
} from '@/hooks/useMonthlyReportData'
import { getMoodEntries } from '@/services/mood-storage'
import { MonthlyStatCards } from '@/components/insights/MonthlyStatCards'
import { MonthHeatmap } from '@/components/insights/MonthHeatmap'
import { ActivityBarChart } from '@/components/insights/ActivityBarChart'
import { MonthlyHighlights } from '@/components/insights/MonthlyHighlights'
import { MonthlyInsightCards } from '@/components/insights/MonthlyInsightCards'
import { MonthlyShareButton } from '@/components/insights/MonthlyShareButton'
import { EmailPreviewModal } from '@/components/insights/EmailPreviewModal'

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

export function MonthlyReport() {
  const { isAuthenticated } = useAuth()
  const defaultMonth = getDefaultMonth()
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth.month)
  const [selectedYear, setSelectedYear] = useState(defaultMonth.year)
  const [showEmailPreview, setShowEmailPreview] = useState(false)

  const data = useMonthlyReportData(selectedMonth, selectedYear)

  const earliest = useMemo(() => {
    const allEntries = getMoodEntries()
    return getEarliestMonth(allEntries)
  }, [selectedMonth, selectedYear])

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const now = new Date()
  const isAtLatest =
    selectedYear > now.getFullYear() ||
    (selectedYear === now.getFullYear() && selectedMonth >= now.getMonth())

  const isAtEarliest =
    selectedYear < earliest.year ||
    (selectedYear === earliest.year && selectedMonth <= earliest.month)

  function goToPreviousMonth() {
    if (isAtEarliest) return
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear((y) => y - 1)
    } else {
      setSelectedMonth((m) => m - 1)
    }
  }

  function goToNextMonth() {
    if (isAtLatest) return
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear((y) => y + 1)
    } else {
      setSelectedMonth((m) => m + 1)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0a1e]">
      <a
        href="#monthly-report-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Navbar transparent />

      {/* Page header */}
      <header className="bg-gradient-to-b from-[#1a0533] to-[#0f0a1e] pt-24 pb-6 md:pt-28 md:pb-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Link
            to="/insights"
            className="mb-4 inline-flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-white/70"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Mood Insights
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={goToPreviousMonth}
              disabled={isAtEarliest}
              aria-label="Previous month"
              className="min-h-[44px] min-w-[44px] rounded-full bg-white/10 p-2 text-white/60 transition-colors hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="flex-1">
              <h1 className="font-serif text-2xl text-white/90 md:text-3xl">
                Your {data.monthName} Faith Journey
              </h1>
              <p className="mt-1 text-sm text-white/60 md:text-base">
                {data.dateRange}
              </p>
            </div>

            <button
              onClick={goToNextMonth}
              disabled={isAtLatest}
              aria-label="Next month"
              className="min-h-[44px] min-w-[44px] rounded-full bg-white/10 p-2 text-white/60 transition-colors hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Content area */}
      <main
        id="monthly-report-content"
        key={`${selectedYear}-${selectedMonth}`}
        className="mx-auto max-w-5xl space-y-6 px-4 pb-12 sm:px-6 opacity-0 animate-fade-in motion-reduce:animate-none motion-reduce:opacity-100"
      >
        <AnimatedSection index={0}>
          <MonthlyStatCards
            daysActive={data.daysActive}
            daysInRange={data.daysInRange}
            pointsEarned={data.pointsEarned}
            startLevel={data.startLevel}
            endLevel={data.endLevel}
            levelProgressPct={data.levelProgressPct}
            moodTrendPct={data.moodTrendPct}
          />
        </AnimatedSection>
        <AnimatedSection index={1}>
          <MonthHeatmap
            month={selectedMonth}
            year={selectedYear}
            monthName={data.monthName}
            entries={data.moodEntries}
          />
        </AnimatedSection>
        <AnimatedSection index={2}>
          <ActivityBarChart activityCounts={data.activityCounts} />
        </AnimatedSection>
        <AnimatedSection index={3}>
          <MonthlyHighlights
            longestStreak={data.longestStreak}
            badgesEarned={data.badgesEarned}
            bestDay={data.bestDay}
          />
        </AnimatedSection>
        <AnimatedSection index={4}>
          <MonthlyInsightCards />
        </AnimatedSection>
        <AnimatedSection index={5}>
          <MonthlyShareButton />
          <button
            className="mt-2 block mx-auto text-sm text-white/50 underline hover:text-white/70"
            onClick={() => setShowEmailPreview(true)}
          >
            Preview Email
          </button>
        </AnimatedSection>
      </main>

      <EmailPreviewModal
        isOpen={showEmailPreview}
        onClose={() => setShowEmailPreview(false)}
        monthName={data.monthName}
      />

      <SiteFooter />
      {import.meta.env.DEV && <DevAuthToggle />}
    </div>
  )
}
