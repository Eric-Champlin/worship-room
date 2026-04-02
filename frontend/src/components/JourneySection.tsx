import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'
import { WHITE_PURPLE_GRADIENT } from '@/constants/gradients'
import { SectionHeading } from '@/components/homepage/SectionHeading'
import { BackgroundSquiggle, SQUIGGLE_MASK_STYLE } from '@/components/BackgroundSquiggle'
import { ArrowRight } from 'lucide-react'

interface JourneyStep {
  number: number
  title: React.ReactNode
  description: string
  route: string
}

const GRADIENT_KEYWORD_STYLE: React.CSSProperties = {
  color: 'white',
  background: WHITE_PURPLE_GRADIENT,
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
}

const JOURNEY_STEPS: JourneyStep[] = [
  {
    number: 1,
    title: <>Read a <span style={GRADIENT_KEYWORD_STYLE}>Devotional</span></>,
    description: 'Start each morning with a short reflection, a verse, and a prayer written just for today.',
    route: '/daily?tab=devotional',
  },
  {
    number: 2,
    title: <>Learn to <span style={GRADIENT_KEYWORD_STYLE}>Pray</span></>,
    description: 'Begin with what\'s on your heart. We\'ll turn your words into a personalized prayer.',
    route: '/daily?tab=pray',
  },
  {
    number: 3,
    title: <>Learn to <span style={GRADIENT_KEYWORD_STYLE}>Journal</span></>,
    description: 'Write freely or follow a guided prompt. Your thoughts stay private and encrypted.',
    route: '/daily?tab=journal',
  },
  {
    number: 4,
    title: <>Learn to <span style={GRADIENT_KEYWORD_STYLE}>Meditate</span></>,
    description: 'Quiet your mind with breathing exercises, scripture soaking, and guided reflection.',
    route: '/daily?tab=meditate',
  },
  {
    number: 5,
    title: <>Listen to <span style={GRADIENT_KEYWORD_STYLE}>Music</span></>,
    description: 'Layer ambient sounds, worship playlists, and bedtime routines to create your sanctuary.',
    route: '/music',
  },
  {
    number: 6,
    title: <>Write on the <span style={GRADIENT_KEYWORD_STYLE}>Prayer Wall</span></>,
    description: 'You\'re not alone. Share what\'s on your heart and pray for others walking the same road.',
    route: '/prayer-wall',
  },
  {
    number: 7,
    title: <>Find <span style={GRADIENT_KEYWORD_STYLE}>Local Support</span></>,
    description: 'Discover churches, counselors, and recovery groups near you when you\'re ready for the next step.',
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
        {/* Upper orb — behind steps 1-3 */}
        <div
          className="absolute left-1/2 -translate-x-1/2 top-[15%] w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full blur-[45px] md:blur-[70px] will-change-transform"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, rgba(139, 92, 246, 0.10) 40%, transparent 70%)',
          }}
        />
        {/* Lower orb — behind steps 5-7 */}
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-[15%] w-[240px] h-[240px] md:w-[400px] md:h-[400px] rounded-full blur-[45px] md:blur-[70px] will-change-transform"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.20) 0%, rgba(139, 92, 246, 0.08) 40%, transparent 70%)',
          }}
        />
      </div>

      {/* BackgroundSquiggle — narrow column behind circles */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex justify-center overflow-hidden"
        style={SQUIGGLE_MASK_STYLE}
      >
        <div className="w-[20%] max-w-[300px]">
          <BackgroundSquiggle className="h-full w-full opacity-30" />
        </div>
      </div>

      <div className="relative mx-auto max-w-2xl">
        <SectionHeading
          topLine="Your Journey to"
          bottomLine="Healing"
          tagline="From prayer to community, every step draws you closer to peace."
          id="journey-heading"
        />

        <ol
          ref={stepsRef as React.RefObject<HTMLOListElement>}
          role="list"
          className="mt-12 space-y-0 sm:mt-16"
        >
          {JOURNEY_STEPS.map((step, index) => (
            <li
              key={step.route}
              className={cn(
                'relative transition-all duration-500 ease-out',
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
              )}
              style={isVisible ? staggerDelay(index, 120, 200) : { transitionDelay: '0ms' }}
            >
              {/* Connecting line between circles (not on last item) */}
              {index < JOURNEY_STEPS.length - 1 && (
                <div
                  aria-hidden="true"
                  className="absolute left-8 top-10 bottom-0 w-px bg-gradient-to-b from-purple-500/30 via-purple-500/15 to-purple-500/30"
                />
              )}
              <Link
                to={step.route}
                className="group flex items-start gap-4 rounded-xl px-3 py-4 transition-colors duration-200 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
              >
                <StepCircle number={step.number} />
                <div className="flex-1 pt-1">
                  <h3 className="text-lg font-bold text-white sm:text-xl">{step.title}</h3>
                  <p className="mt-1 max-w-lg text-sm leading-relaxed text-white sm:text-base">
                    {step.description}
                  </p>
                </div>
                <ArrowRight
                  className="mt-2 h-5 w-5 text-white/0 transition-all duration-200 group-hover:translate-x-1 group-hover:text-white/60"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
