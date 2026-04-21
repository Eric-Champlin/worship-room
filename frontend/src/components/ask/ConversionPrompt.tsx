import { FrostedCard } from '@/components/homepage/FrostedCard'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { cn } from '@/lib/utils'

interface ConversionPromptProps {
  onDismiss: () => void
}

export function ConversionPrompt({ onDismiss }: ConversionPromptProps) {
  const authModal = useAuthModal()

  return (
    <div className="mt-8 motion-safe:animate-fade-in">
      <FrostedCard className="text-center">
        <h3 className="text-lg font-semibold text-white">
          This is just the beginning.
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/80">
          Create an account to save your prayers, journal your thoughts, track your
          growth, and join a community that cares.
        </p>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => authModal?.openAuthModal(undefined, 'register')}
            className="animate-shine inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none"
          >
            Create Your Account
          </button>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className={cn(
            'mt-3 text-sm text-white/70 hover:text-white underline decoration-white/30 hover:decoration-white underline-offset-4 transition-[color,text-decoration-color] duration-base motion-reduce:transition-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
            'min-h-[44px]',
          )}
        >
          Keep exploring
        </button>
      </FrostedCard>
    </div>
  )
}
