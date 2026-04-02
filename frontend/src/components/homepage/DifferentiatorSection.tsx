import { cn } from '@/lib/utils'
import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'
import { GlowBackground } from './GlowBackground'
import { SectionHeading } from './SectionHeading'
import { FrostedCard } from './FrostedCard'
import { DIFFERENTIATORS } from './differentiator-data'

export function DifferentiatorSection() {
  const { ref, isVisible } = useScrollReveal()

  return (
    <GlowBackground variant="split">
      <section
        ref={ref as React.RefObject<HTMLElement>}
        aria-label="What makes Worship Room different"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <div className={cn('scroll-reveal', isVisible && 'is-visible')}>
            <SectionHeading
              topLine="Built for"
              bottomLine="Your Heart"
              tagline="The things we'll never do matter as much as the things we will."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-12 sm:mt-16">
            {DIFFERENTIATORS.map((item, index) => {
              const Icon = item.icon
              return (
                <div
                  key={index}
                  className={cn('scroll-reveal', isVisible && 'is-visible')}
                  style={staggerDelay(index, 100, 200)}
                >
                  <FrostedCard>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/[0.08] border border-white/[0.06] flex items-center justify-center">
                      <Icon
                        className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                        aria-hidden="true"
                      />
                    </div>
                    <h3 className="text-white text-base sm:text-lg font-semibold mt-4">
                      {item.title}
                    </h3>
                    <p className="text-white text-sm leading-relaxed mt-2">
                      {item.description}
                    </p>
                  </FrostedCard>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </GlowBackground>
  )
}
