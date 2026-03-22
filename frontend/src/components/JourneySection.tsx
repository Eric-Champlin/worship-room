import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useInView } from '@/hooks/useInView'
import { BackgroundSquiggle } from '@/components/BackgroundSquiggle'

interface JourneyStep {
  number: number
  prefix: string
  highlight: string
  description: string
  to: string
}

const JOURNEY_STEPS: JourneyStep[] = [
  {
    number: 1,
    prefix: 'Learn to',
    highlight: 'Pray',
    description:
      "Begin with what\u2019s on your heart. Share your feelings and receive a personalized prayer grounded in Scripture.",
    to: '/pray',
  },
  {
    number: 2,
    prefix: 'Learn to',
    highlight: 'Journal',
    description:
      'Put your thoughts into words. Guided prompts help you reflect on what God is doing in your life.',
    to: '/journal',
  },
  {
    number: 3,
    prefix: 'Learn to',
    highlight: 'Meditate',
    description:
      'Quiet your mind with guided meditations rooted in Biblical truth. Let peace settle in.',
    to: '/meditate',
  },
  {
    number: 4,
    prefix: 'Give',
    highlight: 'Thanks',
    description:
      'Count your blessings and watch your perspective shift.',
    to: '/',
  },
  {
    number: 5,
    prefix: 'Listen to',
    highlight: 'Music',
    description:
      'Let music carry you deeper. Curated worship playlists matched to where you are right now.',
    to: '/music',
  },
  {
    number: 6,
    prefix: 'Write on the',
    highlight: 'Prayer Wall',
    description:
      "You\u2019re not alone. Share prayer requests and lift others up in a safe, supportive community.",
    to: '/prayer-wall',
  },
  {
    number: 7,
    prefix: 'Find',
    highlight: 'Local Support',
    description:
      'Find churches and Christian counselors near you. The next step in your healing may be just around the corner.',
    to: '/local-support/churches',
  },
]

function StepCircle({ number }: { number: number }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
        'text-sm font-bold text-hero-bg',
        'sm:h-12 sm:w-12 sm:text-base'
      )}
      style={{
        background: 'linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)',
      }}
    >
      {number}
    </span>
  )
}

export function JourneySection() {
  const [listRef, inView] = useInView<HTMLOListElement>({
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px',
  })

  return (
    <section
      aria-labelledby="journey-heading"
      className="bg-hero-bg px-4 pt-8 pb-16 sm:px-6 sm:pt-12 sm:pb-20 lg:pb-24"
    >
      <div className="mx-auto max-w-2xl">
        <div className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -bottom-16 opacity-30"
            style={{
              maskImage:
                'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
            }}
          >
            <BackgroundSquiggle className="pointer-events-none absolute inset-0 h-full w-full" aspectRatio="none" />
          </div>

          <div className="relative mb-12 text-center sm:mb-16">
            <h2
              id="journey-heading"
              className="mb-3 font-sans text-2xl font-bold text-white sm:text-3xl lg:text-4xl"
            >
              Your Journey to{' '}
              <span
                className="inline-block pb-1 pr-1 font-script text-3xl sm:text-4xl lg:text-5xl"
                style={{
                  background: 'linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Healing
              </span>
            </h2>
            <p className="text-base text-white/80 sm:text-lg">
              From prayer to community, every step draws you closer to peace.
            </p>
          </div>

          <ol ref={listRef} role="list" className="relative flex flex-col">
          {JOURNEY_STEPS.map((step, index) => {
            const isLast = index === JOURNEY_STEPS.length - 1

            return (
              <li
                key={step.to}
                className={cn(
                  'transition-all duration-500 ease-out',
                  inView
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-4 opacity-0'
                )}
                style={{
                  transitionDelay: inView ? `${index * 120}ms` : '0ms',
                }}
              >
                <Link
                  to={step.to}
                  className={cn(
                    'group flex items-start gap-4 rounded-lg p-2 transition-all duration-200',
                    'hover:bg-white/5',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
                  )}
                >
                  <div className="flex flex-col items-center self-stretch">
                    <StepCircle number={step.number} />
                    {!isLast && (
                      <div
                        className="mx-auto mt-1 w-0.5 flex-1 bg-white/20"
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  <div className={cn('pb-8', isLast && 'pb-0')}>
                    <h3 className="mb-1 font-sans text-lg font-semibold text-white group-hover:text-primary-lt sm:text-xl">
                      {step.prefix}{' '}
                      <span
                        className="inline-block pb-1 pr-1 font-script text-2xl sm:text-3xl"
                        style={{
                          background: 'linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)',
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        {step.highlight}
                      </span>
                    </h3>
                    <p className="text-sm leading-relaxed text-white/70 sm:text-base">
                      {step.description}
                    </p>
                  </div>
                </Link>
              </li>
            )
          })}
          </ol>
        </div>
      </div>
    </section>
  )
}
