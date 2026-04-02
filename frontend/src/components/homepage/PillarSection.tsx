import { useScrollReveal } from '@/hooks/useScrollReveal'
import { SectionHeading } from './SectionHeading'
import { GlowBackground } from './GlowBackground'
import { PillarBlock } from './PillarBlock'
import { PILLARS } from './pillar-data'
import type { Pillar } from './pillar-data'

function PillarWithGlow({ pillar }: { pillar: Pillar }) {
  const { ref, isVisible } = useScrollReveal()

  return (
    <GlowBackground variant={pillar.glowVariant}>
      <div ref={ref as React.RefObject<HTMLDivElement>}>
        <PillarBlock pillar={pillar} isVisible={isVisible} />
      </div>
    </GlowBackground>
  )
}

export function PillarSection() {
  return (
    <section aria-label="Feature pillars">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <SectionHeading
          heading="Everything You Need to Heal, Grow, and Connect"
          tagline="Three pillars. One journey. Your pace."
        />
        <div className="mt-14 sm:mt-[4.5rem] space-y-20 sm:space-y-28">
          {PILLARS.map((pillar) => (
            <PillarWithGlow key={pillar.id} pillar={pillar} />
          ))}
        </div>
      </div>
    </section>
  )
}
