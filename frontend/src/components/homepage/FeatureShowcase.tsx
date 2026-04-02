import { useState } from 'react'
import { cn } from '@/lib/utils'
import { GlowBackground } from './GlowBackground'
import { SectionHeading } from './SectionHeading'
import { FeatureShowcaseTabs } from './FeatureShowcaseTabs'
import { FeatureShowcasePanel } from './FeatureShowcasePanel'
import { FEATURE_TABS } from '@/constants/feature-showcase'
import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'

export function FeatureShowcase() {
  const [activeTab, setActiveTab] = useState(FEATURE_TABS[0].id)
  const { ref, isVisible } = useScrollReveal()

  return (
    <GlowBackground variant="split">
      <section
        ref={ref as React.RefObject<HTMLElement>}
        aria-label="Feature previews"
        className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto"
      >
        {/* Heading */}
        <div
          className={cn('scroll-reveal', isVisible && 'is-visible')}
          style={staggerDelay(0, 200)}
        >
          <SectionHeading
            heading="Experience Worship Room"
            tagline="Everything you need for your spiritual journey — in one place."
          />
        </div>

        {/* Tab bar */}
        <div
          className={cn('scroll-reveal mt-10', isVisible && 'is-visible')}
          style={staggerDelay(1, 200)}
        >
          <FeatureShowcaseTabs
            tabs={FEATURE_TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        {/* Preview panel */}
        <div
          className={cn('scroll-reveal mt-8', isVisible && 'is-visible')}
          style={staggerDelay(2, 200)}
        >
          <FeatureShowcasePanel
            tabs={FEATURE_TABS}
            activeTab={activeTab}
          />
        </div>
      </section>
    </GlowBackground>
  )
}
