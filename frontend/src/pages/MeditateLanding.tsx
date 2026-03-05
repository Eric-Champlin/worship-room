import { Link } from 'react-router-dom'
import {
  Wind,
  BookOpen,
  Heart,
  Footprints,
  ScrollText,
  Search,
  Check,
} from 'lucide-react'
import { Layout } from '@/components/Layout'
import { PageHero } from '@/components/PageHero'
import { useCompletionTracking } from '@/hooks/useCompletionTracking'
import { useAuth } from '@/hooks/useAuth'
import { MEDITATION_TYPES } from '@/constants/daily-experience'
import type { MeditationType } from '@/types/daily-experience'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Wind,
  BookOpen,
  Heart,
  Footprints,
  Scroll: ScrollText,
  Search,
}

const ROUTE_MAP: Record<string, string> = {
  breathing: '/meditate/breathing',
  soaking: '/meditate/soaking',
  gratitude: '/meditate/gratitude',
  acts: '/meditate/acts',
  psalm: '/meditate/psalms',
  examen: '/meditate/examen',
}

export function MeditateLanding() {
  const { isLoggedIn } = useAuth()
  const { completedMeditationTypes } = useCompletionTracking()
  const allComplete = completedMeditationTypes.length === 6

  return (
    <Layout hero={<PageHero title="Meditate" subtitle="Take a moment to slow down and be present with God." />}>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">

        {isLoggedIn && allComplete && (
          <div className="mb-8 animate-golden-glow rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
            <p className="text-lg font-semibold text-text-dark">
              You completed all 6 meditations today! What a beautiful time with
              God.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          {MEDITATION_TYPES.map((type) => {
            const Icon = ICON_MAP[type.icon]
            const isComplete = completedMeditationTypes.includes(
              type.id as MeditationType,
            )
            return (
              <Link
                key={type.id}
                to={ROUTE_MAP[type.id]}
                className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
              >
                <div className="mb-3 flex items-center justify-between">
                  {Icon && <Icon className="h-8 w-8 text-primary" />}
                  {isLoggedIn && isComplete && (
                    <Check
                      className="h-5 w-5 text-success"
                      aria-label={`${type.title} completed`}
                    />
                  )}
                </div>
                <h3 className="mb-1 text-base font-semibold text-text-dark sm:text-lg">
                  {type.title}
                </h3>
                <p className="text-xs text-text-light sm:text-sm">
                  {type.description}
                </p>
                <p className="mt-2 text-xs font-medium text-primary">
                  {type.time}
                </p>
              </Link>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}
