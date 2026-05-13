import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useAuth } from '@/hooks/useAuth'
import { useSearchParams } from 'react-router-dom'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

type Length = 1 | 5 | 10

interface PickerOption {
  length: Length
  label: string
  subtitle: string
  ariaLabel: string
}

const OPTIONS: ReadonlyArray<PickerOption> = [
  { length: 1, label: '1 minute', subtitle: 'Quick pause', ariaLabel: '1 minute, Quick pause' },
  { length: 5, label: '5 minutes', subtitle: 'Settled prayer', ariaLabel: '5 minutes, Settled prayer' },
  { length: 10, label: '10 minutes', subtitle: 'Deep sit', ariaLabel: '10 minutes, Deep sit' },
] as const

export function PrayLengthPicker() {
  const authModal = useAuthModal()
  const { isAuthenticated } = useAuth()
  const [, setSearchParams] = useSearchParams()

  const handlePick = (length: Length) => {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to start a timed session')
      return
    }
    setSearchParams({ tab: 'pray', length: String(length) }, { replace: false })
  }

  return (
    <section aria-labelledby="pray-length-picker-heading" className="mb-8">
      <h2
        id="pray-length-picker-heading"
        className="mb-4 text-center text-xl font-semibold text-white sm:text-2xl"
      >
        Start a timed session
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.length}
            type="button"
            onClick={() => handlePick(opt.length)}
            aria-label={opt.ariaLabel}
            className={cn(
              'group block min-h-[44px] w-full rounded-3xl text-left',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
            )}
          >
            <FrostedCard
              variant="default"
              className="transition-all group-hover:-translate-y-0.5 group-hover:bg-white/[0.10] group-hover:shadow-frosted-hover"
            >
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-violet-300" aria-hidden="true" />
                <div>
                  <div className="text-base font-semibold text-white">{opt.label}</div>
                  <div className="text-sm text-white/60">{opt.subtitle}</div>
                </div>
              </div>
            </FrostedCard>
          </button>
        ))}
      </div>
    </section>
  )
}
