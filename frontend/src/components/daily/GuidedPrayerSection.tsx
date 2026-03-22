import {
  Sunrise,
  Moon,
  Leaf,
  Heart,
  Sparkles,
  Unlock,
  Shield,
  HandHeart,
  CheckCircle2,
} from 'lucide-react'
import type { GuidedPrayerSession } from '@/types/guided-prayer'
import { GUIDED_PRAYER_SESSIONS } from '@/data/guided-prayer-sessions'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useCompletionTracking } from '@/hooks/useCompletionTracking'

const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sunrise,
  Moon,
  Leaf,
  Heart,
  Sparkles,
  Unlock,
  Shield,
  HandHeart,
}

interface GuidedPrayerSectionProps {
  onStartSession: (session: GuidedPrayerSession) => void
}

export function GuidedPrayerSection({ onStartSession }: GuidedPrayerSectionProps) {
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const { isGuidedPrayerComplete } = useCompletionTracking()

  const handleCardClick = (session: GuidedPrayerSession) => {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to start a guided prayer session')
      return
    }
    onStartSession(session)
  }

  return (
    <section aria-labelledby="guided-prayer-heading" id="guided-prayer-section">
      <h2
        id="guided-prayer-heading"
        className="font-bold text-text-dark text-xl sm:text-2xl"
      >
        Guided Prayer Sessions
      </h2>
      <p className="mt-1 font-serif italic text-text-light text-base">
        Close your eyes and let God lead
      </p>

      <div className="mt-4 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:pb-0 lg:grid-cols-4 lg:gap-4">
        {GUIDED_PRAYER_SESSIONS.map((session) => {
          const ThemeIcon = ICON_COMPONENTS[session.icon]
          const isComplete = isAuthenticated && isGuidedPrayerComplete(session.id)

          return (
            <button
              key={session.id}
              type="button"
              onClick={() => handleCardClick(session)}
              className="relative min-w-[200px] flex-shrink-0 snap-center rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:min-w-0"
            >
              {isComplete && (
                <CheckCircle2
                  className="absolute right-3 top-3 h-4 w-4 text-success"
                  aria-hidden="true"
                />
              )}

              {ThemeIcon && (
                <ThemeIcon className="mb-2 h-6 w-6 text-primary" aria-hidden="true" />
              )}

              <h3 className="font-medium text-sm text-text-dark">{session.title}</h3>

              <p className="mt-1 text-xs text-text-light line-clamp-2">
                {session.description}
              </p>

              <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-text-light">
                {session.durationMinutes} min
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
