import { Link } from 'react-router-dom'
import { Heart, PenLine, Wind, Check } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { SongPickSection } from '@/components/SongPickSection'
import { StartingPointQuiz } from '@/components/StartingPointQuiz'
import { useCompletionTracking } from '@/hooks/useCompletionTracking'
import { useAuth } from '@/hooks/useAuth'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

const PRACTICE_CARDS = [
  {
    label: 'Pray',
    to: '/pray',
    icon: Heart,
    preview: "What're you feeling? Let's pray about it",
    completionKey: 'pray' as const,
  },
  {
    label: 'Journal',
    to: '/journal',
    icon: PenLine,
    preview: "What's weighing on your heart today?",
    completionKey: 'journal' as const,
  },
  {
    label: 'Meditate',
    to: '/meditate',
    icon: Wind,
    preview: 'Start with a breathing exercise',
    completionKey: 'meditate' as const,
  },
]

export function DailyHub() {
  const { user, isLoggedIn } = useAuth()
  const { isPrayComplete, isJournalComplete, isMeditateComplete } =
    useCompletionTracking()

  const greeting = getGreeting()
  const displayName = user ? `${greeting}, ${user.firstName}!` : `${greeting}!`

  const completionMap: Record<string, boolean> = {
    pray: isPrayComplete,
    journal: isJournalComplete,
    meditate: isMeditateComplete,
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-bg font-sans">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-primary focus:shadow-lg"
      >
        Skip to content
      </a>
      <Navbar transparent />

      <main id="main-content">
        {/* Hero Section — Greeting */}
        <section
          aria-labelledby="daily-hub-heading"
          className="relative flex w-full flex-col items-center px-4 pb-10 pt-32 text-center antialiased sm:pb-12 sm:pt-36 lg:pb-14 lg:pt-40"
          style={{
            backgroundImage: [
              'radial-gradient(ellipse 100% 80% at 50% 0%, #3B0764 0%, transparent 60%)',
              'linear-gradient(to bottom, #0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #F5F5F5 100%)',
            ].join(', '),
            backgroundRepeat: 'no-repeat',
            backgroundSize: '100% 100%',
          }}
        >
          {/* Greeting */}
          <h1
            id="daily-hub-heading"
            className="mb-1 font-script text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl"
          >
            {displayName}
          </h1>
          <p className="text-base text-white/80">
            Start with any practice below.
          </p>
          <p className="mt-2 font-sans text-sm text-white/90">
            Not sure where to start?{' '}
            <button
              type="button"
              onClick={() => {
                document.getElementById('quiz')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="rounded font-semibold text-white underline underline-offset-2 transition-colors hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              Take a 30-second quiz
            </button>{' '}
            and we&apos;ll help you find your path.
          </p>
        </section>

        {/* Practice Cards */}
        <section
          aria-label="Daily practices"
          className="mx-auto max-w-5xl px-4 py-10 sm:py-14"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {PRACTICE_CARDS.map(({ label, to, icon: Icon, preview, completionKey }) => {
              const isComplete = completionMap[completionKey]
              return (
                <Link
                  key={to}
                  to={to}
                  className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md sm:p-8"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <Icon className="h-8 w-8 text-primary sm:h-10 sm:w-10" />
                    <h3 className="font-script text-3xl text-primary sm:text-4xl">
                      {label}
                    </h3>
                    {isLoggedIn && isComplete && (
                      <span className="ml-auto flex items-center gap-1 text-sm font-medium text-success">
                        <Check className="h-5 w-5" aria-hidden="true" />
                        <span className="sr-only">{label} completed</span>
                      </span>
                    )}
                  </div>
                  <p className="text-base text-text-light sm:text-lg">{preview}</p>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Today's Song Pick */}
        <SongPickSection />

        {/* Starting Point Quiz */}
        <StartingPointQuiz hideTopGradient />
      </main>

      <SiteFooter />
    </div>
  )
}
