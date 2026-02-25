import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useInView } from '@/hooks/useInView'

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
    to: '/scripture',
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
    prefix: 'Listen to',
    highlight: 'Music',
    description:
      'Let music carry you deeper. Curated worship playlists matched to where you are right now.',
    to: '/music',
  },
  {
    number: 5,
    prefix: 'Write on the',
    highlight: 'Prayer Wall',
    description:
      "You\u2019re not alone. Share prayer requests and lift others up in a safe, supportive community.",
    to: '/prayer-wall',
  },
  {
    number: 6,
    prefix: 'Find',
    highlight: 'Local Support',
    description:
      'Find churches and Christian counselors near you. The next step in your healing may be just around the corner.',
    to: '/churches',
  },
]

function BackgroundSquiggle() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1200 1350"
      preserveAspectRatio="none"
      fill="none"
    >
      {/* Wide central brushstroke */}
      <path
        d="M400,0 C550,50 300,120 500,200 C700,280 250,370 500,450 C750,530 300,620 550,700 C800,780 350,870 500,960 C650,1050 350,1140 500,1230 L500,1350"
        stroke="#D6D3D1"
        strokeWidth="100"
        strokeLinecap="round"
        opacity="0.25"
      />
      {/* Right sweeping stroke */}
      <path
        d="M700,0 C850,80 600,170 800,260 C1000,350 650,440 850,530 C1050,620 700,710 900,800 C1100,890 750,960 900,1050 C1050,1140 800,1230 950,1350"
        stroke="#D6D3D1"
        strokeWidth="80"
        strokeLinecap="round"
        opacity="0.18"
      />
      {/* Left sweeping stroke */}
      <path
        d="M200,50 C350,130 100,220 300,310 C500,400 150,490 350,580 C550,670 200,760 350,850 C500,940 250,1030 350,1120 C500,1210 250,1280 350,1350"
        stroke="#E7E5E4"
        strokeWidth="90"
        strokeLinecap="round"
        opacity="0.22"
      />
      {/* Thin central accent for depth */}
      <path
        d="M550,20 C700,100 400,190 600,280 C800,370 450,460 650,550 C850,640 500,730 680,820 C860,910 550,1000 680,1090 C810,1180 550,1270 650,1350"
        stroke="#D6D3D1"
        strokeWidth="30"
        strokeLinecap="round"
        opacity="0.15"
      />
      {/* Far-left thin accent */}
      <path
        d="M80,80 C200,160 0,250 150,340 C300,430 50,520 200,610 C350,700 100,790 200,880 C300,970 100,1060 200,1150 C300,1240 120,1300 200,1350"
        stroke="#E7E5E4"
        strokeWidth="45"
        strokeLinecap="round"
        opacity="0.15"
      />
      {/* Far-right thin accent */}
      <path
        d="M1000,30 C1120,110 900,200 1050,290 C1200,380 950,470 1080,560 C1210,650 980,740 1080,830 C1180,920 1000,1010 1080,1100 C1180,1190 1000,1280 1080,1350"
        stroke="#E7E5E4"
        strokeWidth="45"
        strokeLinecap="round"
        opacity="0.15"
      />
    </svg>
  )
}

function StepCircle({ number }: { number: number }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
        'bg-primary text-sm font-bold text-white',
        'sm:h-12 sm:w-12 sm:text-base'
      )}
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
      className="px-4 pt-8 pb-16 sm:px-6 sm:pt-12 sm:pb-20 lg:pb-24"
      style={{
        background: 'linear-gradient(to bottom, #EDE9FE 0%, #F5F5F5 15%)',
      }}
    >
      <div className="mx-auto max-w-2xl">
        <div className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              maskImage:
                'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
            }}
          >
            <BackgroundSquiggle />
          </div>

          <div className="relative mb-12 text-center sm:mb-16">
            <h2
              id="journey-heading"
              className="mb-3 font-sans text-2xl font-bold text-text-dark sm:text-3xl lg:text-4xl"
            >
              Your Journey to{' '}
              <span className="font-script text-3xl text-primary sm:text-4xl lg:text-5xl">
                Healing
              </span>
            </h2>
            <p className="text-base text-text-dark sm:text-lg">
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
                    'hover:bg-white hover:shadow-sm',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
                  )}
                >
                  <div className="flex flex-col items-center self-stretch">
                    <StepCircle number={step.number} />
                    {!isLast && (
                      <div
                        className="mx-auto mt-1 w-0.5 flex-1 bg-primary/30"
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  <div className={cn('pb-8', isLast && 'pb-0')}>
                    <h3 className="mb-1 font-sans text-lg font-semibold text-text-dark group-hover:text-primary sm:text-xl">
                      {step.prefix}{' '}
                      <span className="font-script text-2xl text-primary sm:text-3xl">
                        {step.highlight}
                      </span>
                    </h3>
                    <p className="text-sm leading-relaxed text-text-dark sm:text-base">
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
