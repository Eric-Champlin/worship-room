import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'
import { WHITE_PURPLE_GRADIENT } from '@/constants/gradients'
import { SectionHeading } from '@/components/homepage/SectionHeading'

interface JourneyStep {
  number: number
  prefix: string
  highlight: string
  route: string
}

const JOURNEY_STEPS: JourneyStep[] = [
  {
    number: 1,
    prefix: 'Read a',
    highlight: 'Devotional',
    route: '/daily?tab=devotional',
  },
  {
    number: 2,
    prefix: 'Learn to',
    highlight: 'Pray',
    route: '/daily?tab=pray',
  },
  {
    number: 3,
    prefix: 'Learn to',
    highlight: 'Journal',
    route: '/daily?tab=journal',
  },
  {
    number: 4,
    prefix: 'Learn to',
    highlight: 'Meditate',
    route: '/daily?tab=meditate',
  },
  {
    number: 5,
    prefix: 'Listen to',
    highlight: 'Music',
    route: '/music',
  },
  {
    number: 6,
    prefix: 'Write on the',
    highlight: 'Prayer Wall',
    route: '/prayer-wall',
  },
  {
    number: 7,
    prefix: 'Find',
    highlight: 'Local Support',
    route: '/local-support/churches',
  },
]

function StepCircle({ number }: { number: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-purple-400/40 bg-purple-500/20 text-sm font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.25)] transition-shadow duration-200 group-hover:shadow-[0_0_30px_rgba(139,92,246,0.4)]"
    >
      {number}
    </span>
  )
}

export function JourneySection() {
  const { ref: stepsRef, isVisible } = useScrollReveal({ threshold: 0.1 })

  return (
    <section
      aria-labelledby="journey-heading"
      className="relative bg-hero-bg px-4 py-20 sm:px-6 sm:py-28"
    >
      {/* Glow orbs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-[20%] top-[20%] h-[500px] w-[500px] rounded-full blur-[80px]"
          style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-[20%] right-[15%] h-[400px] w-[400px] rounded-full blur-[80px]"
          style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <SectionHeading
          id="journey-heading"
          heading="Your Journey to Healing"
          tagline="From prayer to community, every step draws you closer to peace."
          align="center"
        />

        <ol
          ref={stepsRef as React.RefObject<HTMLOListElement>}
          role="list"
          className="mt-12 flex flex-wrap justify-center gap-6 sm:mt-16 sm:gap-8 lg:gap-10"
        >
          {JOURNEY_STEPS.map((step, index) => (
            <li
              key={step.route}
              className={cn(
                'transition-all duration-500 ease-out',
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
              )}
              style={isVisible ? staggerDelay(index, 80, 200) : { transitionDelay: '0ms' }}
            >
              <Link
                to={step.route}
                className="group flex w-[100px] flex-col items-center gap-2 text-center sm:w-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
              >
                <StepCircle number={step.number} />
                <span className="text-sm font-medium leading-tight text-white/80 transition-colors duration-200 group-hover:text-white">
                  {step.prefix}
                </span>
                <span
                  className="text-lg font-bold leading-tight sm:text-xl transition-transform duration-200 group-hover:-translate-y-0.5"
                  style={{
                    color: 'white',
                    background: WHITE_PURPLE_GRADIENT,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {step.highlight}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
