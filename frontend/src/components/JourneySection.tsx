import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'
import { BackgroundSquiggle, SQUIGGLE_MASK_STYLE } from '@/components/BackgroundSquiggle'
import { WHITE_PURPLE_GRADIENT } from '@/constants/gradients'

interface JourneyStep {
  number: number
  prefix: string
  highlight: string
  description: string
  route: string
}

const JOURNEY_STEPS: JourneyStep[] = [
  {
    number: 1,
    prefix: 'Read a',
    highlight: 'Devotional',
    description:
      'Start each morning with an inspiring quote, a scripture passage, and a reflection that ties it all together. Fresh content daily, shaped by the season of the church year.',
    route: '/daily?tab=devotional',
  },
  {
    number: 2,
    prefix: 'Learn to',
    highlight: 'Pray',
    description:
      "Begin with what\u2019s on your heart. Share how you\u2019re feeling and receive a personalized prayer grounded in Scripture \u2014 with ambient worship music as the words appear.",
    route: '/daily?tab=pray',
  },
  {
    number: 3,
    prefix: 'Learn to',
    highlight: 'Journal',
    description:
      'Put your thoughts into words. Write freely or follow guided prompts rooted in Scripture. Your entries are private, safe, and always here when you need to look back.',
    route: '/daily?tab=journal',
  },
  {
    number: 4,
    prefix: 'Learn to',
    highlight: 'Meditate',
    description:
      'Quiet your mind with six guided meditation types \u2014 breathing exercises, scripture soaking, gratitude reflections, and more. Let peace settle in.',
    route: '/daily?tab=meditate',
  },
  {
    number: 5,
    prefix: 'Listen to',
    highlight: 'Music',
    description:
      'Let worship carry you deeper. Curated Spotify playlists, 24 ambient sounds with crossfade mixing, and a full sleep library \u2014 scripture readings, bedtime stories, and rest routines.',
    route: '/music',
  },
  {
    number: 6,
    prefix: 'Write on the',
    highlight: 'Prayer Wall',
    description:
      "You\u2019re not alone. Share prayer requests and lift others up in a safe, supportive community. When someone prays for you, you\u2019ll feel it.",
    route: '/prayer-wall',
  },
  {
    number: 7,
    prefix: 'Find',
    highlight: 'Local Support',
    description:
      'Find churches, Christian counselors, and Celebrate Recovery meetings near you. Sometimes healing needs a hand to hold, not just a screen to touch.',
    route: '/local-support/churches',
  },
]

function StepCircle({ number }: { number: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-purple-500/40 bg-purple-500/20 text-sm font-semibold text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]"
    >
      {number}
    </span>
  )
}

export function JourneySection() {
  const { ref: listRef, isVisible } = useScrollReveal({ threshold: 0.1 })

  return (
    <section
      aria-labelledby="journey-heading"
      className="relative bg-hero-bg px-4 py-20 sm:px-6 sm:py-28"
    >
      {/* Background squiggle */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-30"
        style={SQUIGGLE_MASK_STYLE}
      >
        <BackgroundSquiggle className="pointer-events-none absolute inset-0 h-full w-full" aspectRatio="none" />
      </div>

      {/* Glow orbs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[25%] top-[15%] h-[400px] w-[400px] rounded-full bg-purple-500/[0.05] blur-[100px]" />
        <div className="absolute left-[75%] top-[50%] h-[400px] w-[400px] rounded-full bg-purple-500/[0.05] blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-2xl">
        <div className="relative mb-12 text-center sm:mb-16">
          <h2
            id="journey-heading"
            className="mb-3 font-sans text-2xl font-bold text-white sm:text-3xl lg:text-4xl"
          >
            Your Journey to{' '}
            <span
              className="inline-block pb-1 pr-1 font-script text-3xl sm:text-4xl lg:text-5xl"
              style={{
                background: WHITE_PURPLE_GRADIENT,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Healing
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-base text-white/60 sm:text-lg">
            From prayer to community, every step draws you closer to peace.
          </p>
        </div>

        <ol
          ref={listRef as React.RefObject<HTMLOListElement>}
          role="list"
          className="relative flex flex-col"
        >
          {JOURNEY_STEPS.map((step, index) => {
            const isLast = index === JOURNEY_STEPS.length - 1

            return (
              <li
                key={step.route}
                className={cn(
                  'transition-all duration-500 ease-out',
                  isVisible
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-4 opacity-0'
                )}
                style={isVisible ? staggerDelay(index, 120) : { transitionDelay: '0ms' }}
              >
                <Link
                  to={step.route}
                  className={cn(
                    'group flex items-start gap-4 rounded-xl p-2 transition-colors duration-200',
                    'hover:bg-white/[0.02]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
                  )}
                >
                  <div className="flex flex-col items-center self-stretch">
                    <StepCircle number={step.number} />
                    {!isLast && (
                      <div
                        className="mx-auto mt-1 w-px flex-1 bg-gradient-to-b from-purple-500/30 via-purple-500/15 to-purple-500/30"
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  <div className={cn('flex flex-1 items-start gap-2 pb-8', isLast && 'pb-0')}>
                    <div className="flex-1">
                      <h3 className="mb-1 font-sans text-lg font-semibold text-white sm:text-xl">
                        {step.prefix}{' '}
                        <span
                          className="inline-block pb-1 pr-1 font-script text-2xl sm:text-3xl"
                          style={{
                            background: WHITE_PURPLE_GRADIENT,
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }}
                        >
                          {step.highlight}
                        </span>
                      </h3>
                      <p className="max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
                        {step.description}
                      </p>
                    </div>
                    <ArrowRight
                      className="mt-1 h-4 w-4 shrink-0 text-white/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
