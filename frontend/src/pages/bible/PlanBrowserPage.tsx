import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'
import { PlanBrowseCard } from '@/components/bible/plans/PlanBrowseCard'
import { PlanBrowserEmptyState } from '@/components/bible/plans/PlanBrowserEmptyState'
import { PlanBrowserSection } from '@/components/bible/plans/PlanBrowserSection'
import { PlanCompletedCard } from '@/components/bible/plans/PlanCompletedCard'
import { PlanInProgressCard } from '@/components/bible/plans/PlanInProgressCard'
import { SEO } from '@/components/SEO'
import { BIBLE_PLANS_BROWSER_METADATA } from '@/lib/seo/routeMetadata'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { usePlanBrowser } from '@/hooks/bible/usePlanBrowser'

export function PlanBrowserPage() {
  const { sections, filteredBrowse, clearFilters, isEmpty, isFilteredEmpty, isAllStarted } =
    usePlanBrowser()

  return (
    <BackgroundCanvas className="flex flex-col font-sans">
      <Navbar transparent />
      <SEO {...BIBLE_PLANS_BROWSER_METADATA} />

      <main id="main-content" className="relative z-10 flex-1">
        {/* Hero — matches BibleHero spacing (BB-53 parity); pb tightened in Spec 3 */}
        <section className="pt-30 sm:pt-34 relative flex w-full flex-col items-center px-4 pb-3 text-center antialiased sm:pb-4 lg:pt-36">
          <h1
            className="pb-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl"
            style={GRADIENT_TEXT_STYLE}
          >
            Reading Plans
          </h1>
          <p className="mt-3 text-base text-white/60 sm:text-lg">
            Guided daily reading to deepen your walk
          </p>
        </section>

        {/* Content (tightened py in Spec 3; border-t divider removed) */}
        <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
          {/* Empty state: no manifest */}
          {isEmpty && <PlanBrowserEmptyState variant="no-manifest" />}

          {/* In Progress section.
              `first:mt-2` collapses to ~8px when this section is the first rendered child after the hero,
              tightening hero→first-section rhythm. Between-section rhythm preserved by mt-8 / mt-12. */}
          {!isEmpty && sections.inProgress.length > 0 && (
            <PlanBrowserSection title="In progress" className="first:mt-2 mt-8">
              {sections.inProgress.map(({ plan, progress }) => (
                <PlanInProgressCard key={plan.slug} plan={plan} progress={progress} />
              ))}
            </PlanBrowserSection>
          )}

          {/* Browse Plans section */}
          {!isEmpty && (
            <PlanBrowserSection title="Browse plans" className="first:mt-2 mt-12">
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
            <PlanBrowserSection title="Completed" className="first:mt-2 mt-12">
              {sections.completed.map(({ plan, progress }) => (
                <PlanCompletedCard key={plan.slug} plan={plan} progress={progress} />
              ))}
            </PlanBrowserSection>
          )}
        </div>
      </main>

      <SiteFooter />
    </BackgroundCanvas>
  )
}
