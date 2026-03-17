import { Flame } from 'lucide-react'

interface DashboardHeroProps {
  userName: string
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour <= 11) return 'Good morning'
  if (hour >= 12 && hour <= 16) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardHero({ userName }: DashboardHeroProps) {
  const greeting = getGreeting()

  return (
    <section
      aria-label="Dashboard hero"
      className="bg-gradient-to-b from-[#1a0533] to-[#0f0a1e] pt-24 pb-6 md:pt-28 md:pb-8"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <h1 className="font-serif text-2xl text-white/90 md:text-3xl">
            {greeting},{' '}
            <span className="inline-block max-w-[70vw] truncate align-bottom md:max-w-none">
              {userName}
            </span>
          </h1>

          <div className="mt-4 flex flex-col items-center gap-3 md:flex-row md:items-center md:gap-6">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-400" aria-hidden="true" />
              <span className="text-lg font-semibold text-white">
                Start your streak today
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-white/60">Seedling</span>
              <span className="text-sm text-white/60">
                0 Faith Points
              </span>
              <div className="h-1.5 w-32 rounded-full bg-white/10" role="progressbar" aria-valuenow={0} aria-valuemin={0} aria-valuemax={100} aria-label="Level progress" aria-valuetext="Seedling — 0 points to next level">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: '0%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
