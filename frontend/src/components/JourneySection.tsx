import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'
import { WHITE_PURPLE_GRADIENT } from '@/constants/gradients'
import { SectionHeading } from '@/components/homepage/SectionHeading'
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

      {/* Narrow squiggle lines behind numbered circles */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-0 h-full"
        style={{
          width: '150px',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
        }}
        viewBox="0 0 150 1000"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M 45 0 Q 70 40, 45 80 Q 20 120, 45 160 Q 70 200, 45 240 Q 20 280, 45 320 Q 70 360, 45 400 Q 20 440, 45 480 Q 70 520, 45 560 Q 20 600, 45 640 Q 70 680, 45 720 Q 20 760, 45 800 Q 70 840, 45 880 Q 20 920, 45 960 L 45 1000"
          stroke="rgba(214, 211, 209, 0.15)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M 75 0 Q 100 50, 75 100 Q 50 150, 75 200 Q 100 250, 75 300 Q 50 350, 75 400 Q 100 450, 75 500 Q 50 550, 75 600 Q 100 650, 75 700 Q 50 750, 75 800 Q 100 850, 75 900 Q 50 950, 75 1000"
          stroke="rgba(214, 211, 209, 0.20)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 105 0 Q 130 45, 105 90 Q 80 135, 105 180 Q 130 225, 105 270 Q 80 315, 105 360 Q 130 405, 105 450 Q 80 495, 105 540 Q 130 585, 105 630 Q 80 675, 105 720 Q 130 765, 105 810 Q 80 855, 105 900 Q 130 945, 105 1000"
          stroke="rgba(231, 229, 228, 0.12)"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>

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
              <Link
                to={step.route}
                className="group flex items-start gap-4 rounded-xl px-3 py-4 transition-colors duration-200 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
              >
                {/* Circle column — contains circle and connecting line */}
                <div className="relative flex flex-col items-center shrink-0">
                  <StepCircle number={step.number} />
                  {index < JOURNEY_STEPS.length - 1 && (
                    <div
                      aria-hidden="true"
                      className="w-px flex-1 bg-gradient-to-b from-purple-500/30 via-purple-500/15 to-purple-500/30 mt-1"
                    />
                  )}
                </div>
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
