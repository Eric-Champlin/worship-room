import { Check } from 'lucide-react'

import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { SEO } from '@/components/SEO'
import { REGISTER_METADATA } from '@/lib/seo/routeMetadata'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useInView } from '@/hooks/useInView'
import { cn } from '@/lib/utils'

const FEATURES = [
  {
    emoji: '🙏',
    title: 'Prayers written for your heart',
    description:
      'Tell us how you feel and receive a personalized prayer grounded in Scripture — crafted for exactly where you are.',
  },
  {
    emoji: '🌱',
    title: 'Watch your faith grow',
    description:
      'Track streaks, earn faith points, and watch your visual garden bloom as you build daily spiritual habits.',
  },
  {
    emoji: '🤝',
    title: "You're not alone",
    description:
      'Share prayer requests, encourage friends, and join seasonal community challenges with fellow believers.',
  },
  {
    emoji: '📖',
    title: 'Bible, Devotionals & More',
    description:
      'Read the full Bible (WEB), follow reading plans, journal your reflections, and meditate — all in one place.',
  },
] as const

const STATS = [
  { value: '66 books', label: 'Full Bible (WEB)' },
  { value: '50 devotionals', label: 'Daily readings' },
  { value: '24 ambient sounds', label: 'For prayer & rest' },
  { value: '10 reading plans', label: '119 days of content' },
  { value: '5 seasonal challenges', label: '110 days together' },
  { value: 'Completely free', label: 'No credit card ever' },
] as const

const DIFFERENTIATORS = [
  'Free forever — no subscriptions, no trial periods, no "premium" tier.',
  'No ads. Your worship time is sacred, not monetizable.',
  'No data harvesting. Your prayers and journal entries stay private.',
  'Grace-based streaks that celebrate presence, never punish absence.',
] as const

export function RegisterPage() {
  const authModal = useAuthModal()

  const [heroRef, heroInView] = useInView<HTMLElement>({ threshold: 0.1 })
  const [featuresRef, featuresInView] = useInView<HTMLDivElement>({ threshold: 0.1 })
  const [statsRef, statsInView] = useInView<HTMLElement>({ threshold: 0.1 })
  const [diffRef, diffInView] = useInView<HTMLElement>({ threshold: 0.1 })
  const [ctaRef, ctaInView] = useInView<HTMLElement>({ threshold: 0.1 })

  return (
    <div className="flex min-h-screen flex-col bg-dashboard-dark font-sans">
      {/* BB-40: noIndex added; drop inline canonical (default resolves to /register). */}
      <SEO {...REGISTER_METADATA} />
      <Navbar />

      <main id="main-content">
        {/* Hero Section */}
        <section
          ref={heroRef}
          aria-labelledby="register-hero-heading"
          className={cn(
            'bg-gradient-to-b from-hero-dark to-hero-mid pt-32 pb-16 sm:pt-40 sm:pb-24 transition-all motion-reduce:transition-none duration-slow ease-decelerate',
            heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          )}
        >
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h1
              className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl"
              id="register-hero-heading"
              style={GRADIENT_TEXT_STYLE}
            >
              Your sanctuary is ready.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70 sm:text-xl">
              A free, peaceful space for prayer, Scripture, journaling, and
              worship — designed to meet you exactly where you are.
            </p>
            <button
              type="button"
              onClick={() => authModal?.openAuthModal(undefined, 'register')}
              className="mt-8 inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-primary px-8 py-4 text-lg font-medium text-white transition-[colors,transform] duration-fast hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto active:scale-[0.98]"
            >
              Create Your Free Account
            </button>
            <p className="mt-4 text-sm text-white/50">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => authModal?.openAuthModal(undefined, 'login')}
                className="text-primary underline hover:text-primary-lt"
              >
                Log in
              </button>
            </p>
          </div>
        </section>

        {/* Feature Showcase */}
        <section aria-label="Feature highlights" className="py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div
              ref={featuresRef}
              className="grid grid-cols-1 gap-6 sm:grid-cols-2"
            >
              {FEATURES.map((feature, index) => (
                <div
                  key={feature.title}
                  className={cn(
                    'rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm transition-all motion-reduce:transition-none duration-slow ease-decelerate hover:bg-white/[0.07] sm:p-8',
                    featuresInView
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-4'
                  )}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="mb-4 text-4xl">
                    <span role="img" aria-hidden="true">
                      {feature.emoji}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-white/60">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section
          ref={statsRef}
          aria-labelledby="register-stats-heading"
          className="py-16 sm:py-24"
        >
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <h2
              id="register-stats-heading"
              className="mb-12 text-center text-2xl font-bold text-white sm:text-3xl"
            >
              The numbers behind the room
            </h2>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              {STATS.map((stat, index) => (
                <div
                  key={stat.value}
                  className={cn(
                    'text-center transition-all motion-reduce:transition-none duration-slow ease-decelerate',
                    statsInView
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-4'
                  )}
                  style={{ transitionDelay: `${index * 50}ms` }}
                >
                  <div className="text-2xl font-bold text-white">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-sm text-white/60">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Differentiator Checklist */}
        <section
          ref={diffRef}
          aria-labelledby="register-why-heading"
          className={cn(
            'py-16 sm:py-24 transition-all motion-reduce:transition-none duration-slow ease-decelerate',
            diffInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          )}
        >
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <h2
              id="register-why-heading"
              className="mb-12 text-center text-2xl font-bold text-white sm:text-3xl"
            >
              Why Worship Room is different
            </h2>
            <div className="mx-auto max-w-2xl">
              {DIFFERENTIATORS.map((text) => (
                <div key={text} className="mb-6 flex items-start gap-3">
                  <Check
                    className="mt-0.5 flex-shrink-0 text-primary"
                    size={20}
                    aria-hidden="true"
                  />
                  <p className="text-white/80">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section
          ref={ctaRef}
          aria-labelledby="register-cta-heading"
          className={cn(
            'py-16 text-center sm:py-24 transition-all motion-reduce:transition-none duration-slow ease-decelerate',
            ctaInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          )}
        >
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <h2
              id="register-cta-heading"
              className="text-2xl font-bold text-white sm:text-3xl"
            >
              Ready to step inside?
            </h2>
            <button
              type="button"
              onClick={() => authModal?.openAuthModal(undefined, 'register')}
              className="mt-8 inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-primary px-8 py-4 text-lg font-medium text-white transition-[colors,transform] duration-fast hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto active:scale-[0.98]"
            >
              Create Your Free Account
            </button>
            <p className="mt-4 text-sm text-white/50">
              No credit card. No trial period. Just peace.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
