import { cn } from '@/lib/utils'
import { GlowBackground } from './GlowBackground'
import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'

export function FinalCTA() {
  const { ref, isVisible } = useScrollReveal()
  const authModal = useAuthModal()

  return (
    <GlowBackground variant="center" className="py-20 sm:py-28">
      {/* Extra glow orb for slightly more intensity than standard sections */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(139, 92, 246, 0.10) 0%, transparent 70%)',
        }}
      />

      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6"
      >
        <h2
          className={cn(
            'scroll-reveal text-3xl font-bold sm:text-4xl lg:text-5xl',
            isVisible && 'is-visible'
          )}
          style={{ ...GRADIENT_TEXT_STYLE, ...staggerDelay(0) }}
        >
          Your Healing Starts Here
        </h2>

        <p
          className={cn(
            'scroll-reveal mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/55 sm:text-lg',
            isVisible && 'is-visible'
          )}
          style={staggerDelay(1, 150)}
        >
          No credit card. No commitment. Just a quiet room where God meets you
          where you are.
        </p>

        <div
          className={cn('scroll-reveal', isVisible && 'is-visible')}
          style={staggerDelay(2, 150)}
        >
          <button
            type="button"
            onClick={() => authModal?.openAuthModal(undefined, 'register')}
            className="mt-8 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg transition-colors duration-200 hover:bg-white/90 sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Get Started &mdash; It&apos;s Free
          </button>
          <p className="mt-4 text-xs tracking-wide text-white/30">
            Join thousands finding peace, one prayer at a time.
          </p>
        </div>
      </div>
    </GlowBackground>
  )
}
