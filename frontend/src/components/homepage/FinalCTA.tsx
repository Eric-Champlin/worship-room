import { cn } from '@/lib/utils'
import { GlowBackground } from './GlowBackground'
import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'

export function FinalCTA() {
  const { ref, isVisible } = useScrollReveal()
  const authModal = useAuthModal()

  return (
    <GlowBackground variant="none" className="py-20 sm:py-28">
      {/* Strongest glow on entire page — emotional climax */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[360px] md:w-[800px] md:h-[600px] rounded-full blur-[45px] md:blur-[60px] will-change-transform animate-glow-float motion-reduce:animate-none"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.50) 0%, rgba(139, 92, 246, 0.20) 35%, rgba(139, 92, 246, 0.05) 55%, transparent 70%)',
        }}
      />

      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6"
      >
        <div
          className={cn('scroll-reveal', isVisible && 'is-visible')}
          style={staggerDelay(0)}
        >
          <h2>
            <span className="block text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
              Your Healing
            </span>
            <span
              className="block text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mt-1"
              style={GRADIENT_TEXT_STYLE}
            >
              Starts Here
            </span>
          </h2>
        </div>

        <p
          className={cn(
            'scroll-reveal mx-auto mt-4 max-w-xl text-base leading-relaxed text-white sm:text-lg',
            isVisible && 'is-visible'
          )}
          style={staggerDelay(1, 150)}
        >
          No credit card. No commitment.
        </p>

        <div
          className={cn('scroll-reveal', isVisible && 'is-visible')}
          style={staggerDelay(2, 150)}
        >
          <button
            type="button"
            onClick={() => authModal?.openAuthModal(undefined, 'register')}
            className="mt-8 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Get Started &mdash; It&apos;s Free
          </button>
        </div>
      </div>
    </GlowBackground>
  )
}
