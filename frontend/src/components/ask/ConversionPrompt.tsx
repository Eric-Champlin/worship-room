import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface ConversionPromptProps {
  onDismiss: () => void
  prefersReducedMotion: boolean
}

export function ConversionPrompt({ onDismiss, prefersReducedMotion }: ConversionPromptProps) {
  return (
    <div
      className={cn(
        'mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-sm sm:p-5 lg:p-6',
        !prefersReducedMotion && 'animate-fade-in',
      )}
    >
      <h3 className="text-lg font-semibold text-white">
        This is just the beginning.
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-white/70">
        Create a free account to save your prayers, journal your thoughts,
        track your growth, and join a community that cares.
      </p>
      <div className="mt-4">
        <Link
          to="/register"
          className={cn(
            'inline-block min-h-[44px] rounded-full bg-primary px-6 py-3 font-semibold text-white',
            'transition-colors hover:bg-primary-lt',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          )}
        >
          Get Started — It's Free
        </Link>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className={cn(
          'mt-3 text-sm text-primary-lt hover:underline',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          'min-h-[44px]',
        )}
      >
        Keep exploring
      </button>
    </div>
  )
}
