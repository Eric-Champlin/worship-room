import { Layout } from '@/components/Layout'
import { PlanBrowseCard } from '@/components/bible/plans/PlanBrowseCard'
import { PlanBrowserEmptyState } from '@/components/bible/plans/PlanBrowserEmptyState'
import { PlanBrowserSection } from '@/components/bible/plans/PlanBrowserSection'
import { PlanCompletedCard } from '@/components/bible/plans/PlanCompletedCard'
import { PlanFilterBar } from '@/components/bible/plans/PlanFilterBar'
import { PlanInProgressCard } from '@/components/bible/plans/PlanInProgressCard'
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { SEO } from '@/components/SEO'
import { BIBLE_PLANS_BROWSER_METADATA } from '@/lib/seo/routeMetadata'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { usePlanBrowser } from '@/hooks/bible/usePlanBrowser'

export function PlanBrowserPage() {
  const {
    sections,
    filteredBrowse,
    theme,
    duration,
    setTheme,
    setDuration,
    clearFilters,
    isEmpty,
    isFilteredEmpty,
    isAllStarted,
  } = usePlanBrowser()

  return (
    <Layout>
      <SEO {...BIBLE_PLANS_BROWSER_METADATA} />
      <div className="min-h-screen bg-dashboard-dark">
        {/* Hero */}
        <section
          className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
          style={ATMOSPHERIC_HERO_BG}
        >
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl" style={GRADIENT_TEXT_STYLE}>
            Reading Plans
          </h1>
          <p className="mt-3 text-base text-white/60 sm:text-lg">
            Guided daily reading to deepen your walk
          </p>
        </section>

        {/* Content */}
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
          <PlanFilterBar
            theme={theme}
            duration={duration}
            onThemeChange={setTheme}
            onDurationChange={setDuration}
          />

          {/* Empty state: no manifest */}
          {isEmpty && <PlanBrowserEmptyState variant="no-manifest" />}

          {/* In Progress section */}
          {!isEmpty && sections.inProgress.length > 0 && (
            <PlanBrowserSection title="In progress" className="mt-8">
              {sections.inProgress.map(({ plan, progress }) => (
                <PlanInProgressCard key={plan.slug} plan={plan} progress={progress} />
              ))}
            </PlanBrowserSection>
          )}

          {/* Browse Plans section */}
          {!isEmpty && (
            <PlanBrowserSection title="Browse plans" className="mt-12">
              {isAllStarted ? (
                <PlanBrowserEmptyState variant="all-started" />
              ) : isFilteredEmpty ? (
                <PlanBrowserEmptyState variant="filtered-out" onClearFilters={clearFilters} />
              ) : (
                filteredBrowse.map((plan) => <PlanBrowseCard key={plan.slug} plan={plan} />)
              )}
            </PlanBrowserSection>
          )}

          {/* Completed section */}
          {!isEmpty && sections.completed.length > 0 && (
            <PlanBrowserSection title="Completed" className="mt-12">
              {sections.completed.map(({ plan, progress }) => (
                <PlanCompletedCard key={plan.slug} plan={plan} progress={progress} />
              ))}
            </PlanBrowserSection>
          )}
        </div>
      </div>
    </Layout>
  )
}
