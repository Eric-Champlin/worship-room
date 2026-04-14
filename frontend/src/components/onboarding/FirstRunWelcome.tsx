import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Sun, HelpCircle, ListChecks } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FirstRunWelcomeProps {
  onDismiss: () => void
}

export function FirstRunWelcome({ onDismiss }: FirstRunWelcomeProps) {
  const navigate = useNavigate()

  const handleDismiss = useCallback(() => {
    onDismiss()
  }, [onDismiss])

  const handleNavigate = useCallback(
    (to: string) => {
      onDismiss()
      if (to.startsWith('/#')) {
        window.location.href = to
      } else {
        navigate(to)
      }
    },
    [onDismiss, navigate],
  )

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleDismiss()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleDismiss])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Worship Room"
    >
      <div
        className={cn(
          'relative w-full max-w-[480px] p-6 sm:p-8',
          'bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl',
          'shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]',
          'motion-safe:animate-fade-in-up',
        )}
      >
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Welcome to Worship Room
        </h2>

        <p className="mt-3 text-base text-white/80 leading-relaxed">
          A quiet place to read Scripture, pray, journal, and find peace — at
          your own pace, whenever you need it.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StartHereCard
            icon={BookOpen}
            label="Read the Bible"
            to="/bible"
            onNavigate={handleNavigate}
          />
          <StartHereCard
            icon={Sun}
            label="Try a daily devotional"
            to="/daily"
            onNavigate={handleNavigate}
          />
          <StartHereCard
            icon={HelpCircle}
            label="Take the starting quiz"
            to="/#quiz"
            onNavigate={handleNavigate}
          />
          <StartHereCard
            icon={ListChecks}
            label="Browse reading plans"
            to="/grow?tab=plans"
            onNavigate={handleNavigate}
          />
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={handleDismiss}
            className="text-sm text-white/50 hover:text-white/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}

function StartHereCard({
  icon: Icon,
  label,
  to,
  onNavigate,
}: {
  icon: LucideIcon
  label: string
  to: string
  onNavigate: (to: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(to)}
      className={cn(
        'flex items-center gap-3 rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-3',
        'min-h-[44px] text-left text-sm font-medium text-white',
        'transition-colors hover:bg-white/[0.08]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
        'active:scale-[0.98]',
      )}
    >
      <Icon className="h-5 w-5 shrink-0 text-primary-lt" aria-hidden="true" />
      {label}
    </button>
  )
}
