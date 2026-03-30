import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { SiteFooter } from '@/components/SiteFooter'
import { SEO } from '@/components/SEO'
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
import { MonthlySuggestions } from '@/components/insights/MonthlySuggestions'
import { MonthlyShareButton } from '@/components/insights/MonthlyShareButton'
import { getMonthlyReportSuggestions } from '@/hooks/useMonthlyReportSuggestions'
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
  const suggestions = getMonthlyReportSuggestions(data)

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
    <div className="min-h-screen bg-dashboard-dark">
      <SEO title="Monthly Mood Report" description="Your monthly spiritual growth and mood tracking summary." noIndex />
      <a
        href="#monthly-report-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Navbar transparent />

      {/* Hero section */}
      <section
        aria-labelledby="monthly-report-heading"
        className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
        style={ATMOSPHERIC_HERO_BG}
      >
        <h1
          id="monthly-report-heading"
          className="mb-3 px-1 sm:px-2 font-script text-3xl font-bold leading-tight bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl"
        >
          Monthly Report
        </h1>
        <div className="mt-2 flex items-center gap-3">
          <button
            onClick={goToPreviousMonth}
            disabled={isAtEarliest}
            aria-label="Previous month"
            className="min-h-[44px] min-w-[44px] rounded-full p-2 text-white/40 transition-colors hover:text-white/70 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="text-lg text-white/85 sm:text-xl">{data.monthName} {data.year}</span>
          <button
            onClick={goToNextMonth}
            disabled={isAtLatest}
            aria-label="Next month"
            className="min-h-[44px] min-w-[44px] rounded-full p-2 text-white/40 transition-colors hover:text-white/70 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Insights', href: '/insights' },
          { label: 'Monthly Report' },
        ]}
        maxWidth="max-w-5xl"
      />

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
        {suggestions.length > 0 && (
          <AnimatedSection index={5}>
            <MonthlySuggestions suggestions={suggestions} />
          </AnimatedSection>
        )}
        <AnimatedSection index={suggestions.length > 0 ? 6 : 5}>
          <MonthlyShareButton />
          <button
            className="mt-2 mx-auto inline-flex min-h-[44px] items-center text-sm text-white/50 underline hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
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
