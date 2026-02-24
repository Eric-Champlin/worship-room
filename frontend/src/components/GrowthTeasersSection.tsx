import { Link } from 'react-router-dom'
import { BarChart3, Flame, Users, Lock, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useInView } from '@/hooks/useInView'

const HEATMAP_COLORS = [
  '#27AE60', '#6BCB77', '#27AE60', '#2a2040', '#F39C12', '#27AE60', '#6BCB77',
  '#2a2040', '#27AE60', '#6BCB77', '#27AE60', '#27AE60', '#2a2040', '#E74C3C',
  '#6BCB77', '#27AE60', '#F39C12', '#6BCB77', '#27AE60', '#27AE60', '#6BCB77',
  '#27AE60', '#6BCB77', '#27AE60', '#2a2040', '#27AE60', '#6BCB77', '#27AE60',
]

const LEADERBOARD_ROWS = [
  { rank: 1, name: 'Sarah M.', points: 280, isYou: false },
  { rank: 2, name: 'David K.', points: 245, isYou: false },
  { rank: 3, name: 'Rachel T.', points: 190, isYou: false },
  { rank: 4, name: 'You', points: 145, isYou: true },
]

function FrostedOverlay() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center rounded-t-2xl backdrop-blur-sm"
      style={{ background: 'rgba(13, 6, 32, 0.5)' }}
    >
      <Lock className="h-6 w-6 text-white/40" aria-hidden="true" />
    </div>
  )
}

function MoodInsightsPreview() {
  return (
    <div className="relative h-[150px] overflow-hidden rounded-t-2xl p-4">
      <div className="grid grid-cols-7 gap-1">
        {HEATMAP_COLORS.map((color, i) => (
          <div
            key={i}
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <svg
        className="mt-3 w-full"
        viewBox="0 0 200 40"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M0,35 C30,32 50,28 80,22 C110,16 140,12 170,8 C185,5 195,3 200,2"
          stroke="#6D28D9"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <FrostedOverlay />
    </div>
  )
}

function StreaksPreview() {
  return (
    <div className="relative flex h-[150px] flex-col items-center justify-center gap-1 overflow-hidden rounded-t-2xl p-4">
      <p className="text-2xl font-bold text-white" aria-hidden="true">
        🔥 12 Days
      </p>
      <p className="text-lg text-primary-lt" aria-hidden="true">
        ⭐ 145 pts
      </p>
      <div className="mt-1 flex gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
          <Check className="h-4 w-4 text-white" aria-hidden="true" />
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
          <Check className="h-4 w-4 text-white" aria-hidden="true" />
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2a2040]">
          <Lock className="h-3 w-3 text-white/30" aria-hidden="true" />
        </span>
      </div>
      <FrostedOverlay />
    </div>
  )
}

function LeaderboardPreview() {
  return (
    <div className="relative flex h-[150px] flex-col justify-center gap-2 overflow-hidden rounded-t-2xl px-5 py-4">
      {LEADERBOARD_ROWS.map((row) => (
        <div
          key={row.rank}
          className={cn(
            'flex items-center gap-3 px-2 py-1',
            row.isYou && 'rounded bg-white/5'
          )}
        >
          <span className="w-6 text-sm text-white/60">#{row.rank}</span>
          <span
            className="flex-1 text-sm text-white"
            style={{ filter: 'blur(3px)' }}
            aria-hidden="true"
          >
            {row.name}
          </span>
          <span className="text-sm font-medium text-white/80">{row.points}</span>
        </div>
      ))}
      <FrostedOverlay />
    </div>
  )
}

const CARDS = [
  {
    title: 'Mood Insights',
    description: 'See how God is meeting you over time.',
    icon: BarChart3,
    iconColor: '#6D28D9',
    preview: MoodInsightsPreview,
  },
  {
    title: 'Streaks & Faith Points',
    description: 'Build daily habits and watch your faith grow.',
    icon: Flame,
    iconColor: '#F39C12',
    preview: StreaksPreview,
  },
  {
    title: 'Friends & Leaderboard',
    description: 'Grow together and encourage each other.',
    icon: Users,
    iconColor: '#00D4FF',
    preview: LeaderboardPreview,
  },
]

export function GrowthTeasersSection() {
  const [gridRef, inView] = useInView<HTMLDivElement>({
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px',
  })

  return (
    <section aria-labelledby="growth-heading">
      {/* Gradient transition from JourneySection's light bg into hero purple */}
      <div
        className="h-32 sm:h-40"
        style={{
          background: 'linear-gradient(to bottom, #F5F5F5 0%, #251248 100%)',
        }}
      />

      {/* Content area — solid hero purple background */}
      <div
        className="px-4 pt-12 pb-20 sm:px-6 sm:pt-16 sm:pb-24"
        style={{ background: '#251248' }}
      >
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2
            id="growth-heading"
            className="mb-3 font-sans text-[1.7rem] font-bold text-white sm:text-[2.1rem] lg:text-[2.625rem]"
          >
            See How You&apos;re{' '}
            <span
              className="text-4xl sm:text-5xl lg:text-6xl"
              style={{
                fontFamily: "'Caveat', cursive",
                color: '#8B5CF6',
              }}
            >
              Growing
            </span>
          </h2>
          <p className="text-base text-white sm:text-lg">
            Create a free account and unlock your personal dashboard.
          </p>
        </div>

        <div
          ref={gridRef}
          className="mt-12 grid grid-cols-1 gap-6 sm:mt-16 sm:grid-cols-3"
        >
          {CARDS.map((card, index) => {
            const Preview = card.preview
            const Icon = card.icon

            return (
              <div
                key={card.title}
                data-testid="growth-card"
                className={cn(
                  'overflow-hidden rounded-2xl border transition-all duration-300',
                  'hover:-translate-y-1 hover:shadow-xl',
                  inView
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-4 opacity-0'
                )}
                style={{
                  background: '#1a1030',
                  borderColor: '#2a2040',
                  transitionDelay: inView ? `${index * 200}ms` : '0ms',
                }}
              >
                <Preview />
                <div className="p-5">
                  <Icon
                    className="mb-2 h-5 w-5"
                    style={{ color: card.iconColor }}
                    aria-hidden="true"
                  />
                  <h3 className="text-base font-semibold text-white">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-sm text-white/60">
                    {card.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-12 text-center sm:mt-16">
          <Link
            to="/register"
            className={cn(
              'inline-flex items-center rounded-full bg-primary px-8 py-3 text-base font-medium text-white',
              'transition-all hover:bg-primary-lt hover:shadow-lg',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
            )}
          >
            Create a Free Account
          </Link>
          <p className="mt-4 text-sm text-white/50">
            It&apos;s free. No catch.
          </p>
        </div>
      </div>
      </div>
    </section>
  )
}
