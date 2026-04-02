import { cn } from '@/lib/utils'
import { FrostedCard } from './FrostedCard'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import type { FeatureTab } from '@/constants/feature-showcase'
import { DevotionalPreview } from './previews/DevotionalPreview'
import { PrayerPreview } from './previews/PrayerPreview'
import { MeditationPreview } from './previews/MeditationPreview'
import { PrayerWallPreview } from './previews/PrayerWallPreview'
import { GrowthPreview } from './previews/GrowthPreview'

interface FeatureShowcasePanelProps {
  tabs: FeatureTab[]
  activeTab: string
}

const PREVIEW_MAP: Record<string, React.ComponentType> = {
  devotional: DevotionalPreview,
  prayer: PrayerPreview,
  meditation: MeditationPreview,
  'prayer-wall': PrayerWallPreview,
  growth: GrowthPreview,
}

export function FeatureShowcasePanel({
  tabs,
  activeTab,
}: FeatureShowcasePanelProps) {
  return (
    <FrostedCard className="p-0 overflow-hidden min-h-[280px] sm:min-h-[320px] lg:min-h-[400px]">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        const Preview = PREVIEW_MAP[tab.id]
        return (
          <div
            key={tab.id}
            role="tabpanel"
            id={`panel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            className={cn(
              'transition-opacity duration-200 ease-out motion-reduce:transition-none',
              isActive
                ? 'opacity-100 relative'
                : 'opacity-0 pointer-events-none absolute inset-0'
            )}
            {...(!isActive && { 'aria-hidden': true, tabIndex: -1 })}
          >
            <div className="p-6 sm:p-8 grid gap-6 lg:gap-8 lg:grid-cols-2 items-center">
              {/* Left column: text content */}
              <div className="space-y-4">
                <h3
                  className="text-xl sm:text-2xl font-bold"
                  style={GRADIENT_TEXT_STYLE}
                >
                  {tab.title}
                </h3>
                <p className="text-white/60 text-sm sm:text-base leading-relaxed">
                  {tab.description}
                </p>
                <ul className="space-y-2">
                  {tab.highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="flex items-start gap-2 text-white/50 text-sm"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0"
                        aria-hidden="true"
                      />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right column: mockup preview */}
              <div>{Preview && <Preview />}</div>
            </div>
          </div>
        )
      })}
    </FrostedCard>
  )
}
