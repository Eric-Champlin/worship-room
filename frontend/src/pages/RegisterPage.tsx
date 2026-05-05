import { Check, HandHeart, BookOpen, Sprout, Moon, Users, Sparkles } from 'lucide-react'
import type { RefObject } from 'react'

import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { SEO } from '@/components/SEO'
import { REGISTER_METADATA } from '@/lib/seo/routeMetadata'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'
import { GlowBackground } from '@/components/homepage/GlowBackground'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { SectionHeading } from '@/components/homepage/SectionHeading'
import { StatsBar } from '@/components/homepage/StatsBar'
import { DashboardPreview } from '@/components/homepage/DashboardPreview'
import { cn } from '@/lib/utils'

const PILLARS = [
  {
    name: 'PRAY',
    icon: HandHeart,
    tagline:
      "Personal prayer, guided sessions, and a quiet place to bring everything you're carrying.",
    features: [
      'Personalized prayer generation (Pray tab on Daily Hub)',
      '8 guided prayer sessions (5-15 minutes each)',
      'Your personal prayer list with answered tracking',
      'Prayer Wall community (9 categories, anonymous option)',
      'Crisis support detection with hotline resources',
    ],
  },
  {
    name: 'READ',
    icon: BookOpen,
    tagline:
      'The full Bible, never gated — with AI explainers, search, memorization, and visual progress.',
    features: [
      'Full 66-book WEB Bible (free, no account needed)',
      'AI Explain This Passage (powered by Gemini)',
      'Full audio Bible with sleep timer and continuous playback',
      'Verse memorization deck (no quizzes, no scoring)',
      'Reading heatmap + progress map across all 66 books',
    ],
  },
  {
    name: 'GROW',
    icon: Sprout,
    tagline: 'Habits that honor presence over perfection. Miss a day — keep your streak.',
    features: [
      '10 reading plans (119 days of content)',
      '5 seasonal community challenges (110 days total)',
      'Grace-based streaks with 1 free repair per week',
      'Visual Growth Garden that blooms as you grow',
      '45+ badges across 6 achievement categories',
    ],
  },
  {
    name: 'REST',
    icon: Moon,
    tagline: 'Sleep better. Meditate on Scripture. Build your own ambient mix.',
    features: [
      '24 ambient sounds + 11 scene presets (crossfade mixing)',
      '12 bedtime stories rooted in Scripture',
      '24 scripture readings for rest and sleep',
      '6 meditation practices (Breathing, Soaking, Examen, more)',
      'Sleep timer with smooth 20-second fade-out',
    ],
  },
  {
    name: 'BELONG',
    icon: Users,
    tagline: 'Community without noise. Friends, gentle nudges, and local support when you need it.',
    features: [
      'Prayer Wall feed with question of the day',
      'Friends with gentle nudges (1/week max)',
      'Friends + global faith points leaderboard',
      'Local church, counselor, and Celebrate Recovery finders (real Google data)',
      'Public growth profiles (engagement, never mood data)',
    ],
  },
  {
    name: 'DISCOVER',
    icon: Sparkles,
    tagline: 'Small moments of surprise the app quietly plans for you.',
    features: [
      "Midnight verse reveal when you're up past 11 PM",
      'Verse echoes: we bring back what you highlighted months ago',
      'Song of the Day: 30 rotating worship tracks to discover',
      'Seasonal banners for Advent, Lent, Easter, and more',
      'Anniversary celebrations on your 30-day, 100-day, and 1-year marks',
    ],
  },
] as const

const SPOTLIGHTS = [
  {
    name: 'Verse Echoes',
    description:
      'Thirty days after you highlight a verse, the app gently reminds you. Six months later, still there. Worship Room remembers your journey and brings it back when it matters — not when an algorithm wants engagement.',
    proofLabel: 'Powered by your own reading history',
  },
  {
    name: 'Grace-Based Streaks',
    description:
      "Every other app punishes you for missing a day. This one gives you a free repair each week. Because the goal isn't the streak — it's the presence. Miss a day, pick it back up, no shame.",
    proofLabel: '1 free repair per week, always',
  },
  {
    name: 'Midnight Verse',
    description:
      "Open the app between 11 PM and 1 AM and a special verse meets you there. Quiet, thoughtful, never pushy. For the nights when sleep won't come and you need something to hold on to.",
    proofLabel: 'Shows once per late-night visit',
  },
] as const

const DIFFERENTIATORS = [
  'No ads, ever. Your worship time is not monetizable through interruption.',
  'No data harvesting. Your prayers and journal entries stay private.',
  'Grace-based streaks that celebrate presence, never punish absence.',
  'The entire Bible is free to read — no account required.',
  'Your prayers, journals, and bookmarks are yours. Export or delete them anytime.',
  'Crisis keyword detection with real hotline resources when you need them.',
  'Works offline as an installable app (iOS, Android, desktop).',
  'Real accessibility — WCAG 2.2 AA audited, not an afterthought.',
] as const

export function RegisterPage() {
  const authModal = useAuthModal()

  const hero = useScrollReveal({ threshold: 0.1 })
  const hook = useScrollReveal({ threshold: 0.1 })
  const pillars = useScrollReveal({ threshold: 0.1 })
  const spotlight = useScrollReveal({ threshold: 0.1 })
  const diff = useScrollReveal({ threshold: 0.1 })
  const callout = useScrollReveal({ threshold: 0.1 })
  const finalCta = useScrollReveal({ threshold: 0.1 })

  return (
    <div className="min-h-screen bg-hero-bg font-sans">
      <SEO {...REGISTER_METADATA} />
      <Navbar transparent hideBanner />

      <GlowBackground variant="fullPage">
        <main id="main-content" className="relative z-10">
          {/* Hero — no inner GlowBackground (fullPage wrapper provides orbs) */}
          <section
            ref={hero.ref as RefObject<HTMLElement>}
            aria-labelledby="register-hero-heading"
            className={cn('scroll-reveal', hero.isVisible && 'is-visible')}
          >
            <div className="mx-auto max-w-4xl px-4 pb-20 pt-32 text-center sm:px-6 sm:pb-28 sm:pt-40">
              <h1
                id="register-hero-heading"
                className="animate-gradient-shift pb-2 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl"
                style={GRADIENT_TEXT_STYLE}
              >
                Your room is ready.
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80 sm:text-xl">
                A peaceful space for prayer, Scripture, community, and rest. Eighty-two features. No
                ads. No credit card to sign up.
              </p>
              <button
                type="button"
                onClick={() => authModal?.openAuthModal(undefined, 'register')}
                className="animate-shine mt-8 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-colors duration-base hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none"
              >
                Create Your Account
              </button>
              <p className="mt-4 text-sm text-white/60">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => authModal?.openAuthModal(undefined, 'login')}
                  className="text-white underline hover:text-white/80"
                >
                  Log in
                </button>
              </p>
            </div>
          </section>

          {/* Hook */}
          <section
            ref={hook.ref as RefObject<HTMLElement>}
            aria-labelledby="register-hook-heading"
            className={cn('scroll-reveal py-16 sm:py-24', hook.isVisible && 'is-visible')}
          >
            <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
              <p className="mb-4 text-sm uppercase tracking-widest text-white/60">
                Why we built this
              </p>
              <h2
                id="register-hook-heading"
                className="pb-2 text-3xl font-bold sm:text-4xl lg:text-5xl"
                style={GRADIENT_TEXT_STYLE}
              >
                Faith tools that meet you where you are.
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-base text-white/80 sm:text-lg">
                Most Bible apps gate premium content, push notifications you didn't ask for, and
                punish you for missing a day. Worship Room is different. The entire Bible is free to
                read without an account. Streaks come with grace-based repairs — miss a day, get one
                back. Your prayers stay private. No ads will ever appear in your worship time. This
                is a room built for quiet, not performance.
              </p>
            </div>
          </section>

          {/* StatsBar */}
          <StatsBar />

          {/* Pillar grid */}
          <section
            ref={pillars.ref as RefObject<HTMLElement>}
            aria-labelledby="register-pillars-heading"
            className="py-16 sm:py-24"
          >
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <SectionHeading
                id="register-pillars-heading"
                heading="Everything included when you sign up."
              />
              <p className="mx-auto mb-12 mt-4 max-w-2xl text-center text-base text-white/60 sm:text-lg">
                Eighty-two shipped features across six pillars. No ads. No dark patterns. No upsells
                that interrupt you mid-prayer.
              </p>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {PILLARS.map((pillar, index) => {
                  const Icon = pillar.icon
                  return (
                    <div
                      key={pillar.name}
                      className={cn('scroll-reveal', pillars.isVisible && 'is-visible')}
                      style={staggerDelay(index, 50)}
                    >
                      <FrostedCard className="h-full transition-transform duration-base hover:-translate-y-0.5 motion-reduce:transition-none">
                        <div className="flex h-full flex-col">
                          <div className="mb-4">
                            <Icon size={32} className="text-white" aria-hidden="true" />
                          </div>
                          <h3 className="mb-2 text-xl font-semibold text-white">{pillar.name}</h3>
                          <p className="mb-4 text-sm leading-relaxed text-white/80">
                            {pillar.tagline}
                          </p>
                          <ul className="mt-auto space-y-1.5 text-sm text-white/80">
                            {pillar.features.map((feature) => (
                              <li key={feature} className="flex items-start gap-2">
                                <Check
                                  size={16}
                                  className="mt-0.5 flex-shrink-0 text-white"
                                  aria-hidden="true"
                                />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </FrostedCard>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          {/* DashboardPreview */}
          <DashboardPreview />

          {/* Spotlight */}
          <section
            ref={spotlight.ref as RefObject<HTMLElement>}
            aria-labelledby="register-spotlight-heading"
            className="py-16 sm:py-24"
          >
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <SectionHeading
                id="register-spotlight-heading"
                heading="Small details you won't find anywhere else."
              />
              <p className="mx-auto mb-12 mt-4 max-w-2xl text-center text-base text-white/60 sm:text-lg">
                The things we cared about that no one else seems to.
              </p>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {SPOTLIGHTS.map((card, index) => (
                  <div
                    key={card.name}
                    className={cn('scroll-reveal', spotlight.isVisible && 'is-visible')}
                    style={staggerDelay(index, 50)}
                  >
                    <FrostedCard className="transition-transform duration-base hover:-translate-y-0.5 motion-reduce:transition-none">
                      <h3 className="mb-3 text-xl font-semibold text-white">{card.name}</h3>
                      <p className="mb-4 text-sm leading-relaxed text-white/80">
                        {card.description}
                      </p>
                      <p className="text-xs uppercase tracking-wide text-white/60">
                        {card.proofLabel}
                      </p>
                    </FrostedCard>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Differentiator */}
          <section
            ref={diff.ref as RefObject<HTMLElement>}
            aria-labelledby="register-diff-heading"
            className="py-16 sm:py-24"
          >
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <SectionHeading
                id="register-diff-heading"
                heading="Worship Room is different."
                className="mb-12"
              />
              <div className="mx-auto max-w-2xl">
                {DIFFERENTIATORS.map((text, index) => (
                  <div
                    key={text}
                    className={cn(
                      'scroll-reveal mb-6 flex items-start gap-3',
                      diff.isVisible && 'is-visible'
                    )}
                    style={staggerDelay(index, 50)}
                  >
                    <Check
                      size={20}
                      className="mt-0.5 flex-shrink-0 text-white"
                      aria-hidden="true"
                    />
                    <p className="text-white/80">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Content depth callout */}
          <section
            ref={callout.ref as RefObject<HTMLElement>}
            aria-labelledby="register-callout-heading"
            className={cn('scroll-reveal py-16 sm:py-24', callout.isVisible && 'is-visible')}
          >
            <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
              <p className="mb-4 text-sm uppercase tracking-widest text-white/60">
                Built by one person
              </p>
              <h2
                id="register-callout-heading"
                className="pb-2 text-3xl font-bold sm:text-4xl lg:text-5xl"
                style={GRADIENT_TEXT_STYLE}
              >
                Six months of nights and weekends.
              </h2>
              <p className="mt-6 text-base text-white/80 sm:text-lg">
                Worship Room was built by one developer, after hours, because the tools for faith
                deserved better. No VC funding. No growth team. No dark patterns. Just someone who
                wanted a space for prayer and Scripture that felt more like a sanctuary than an app.
                That's what you're signing up for.
              </p>
            </div>
          </section>

          {/* Final CTA */}
          <section
            ref={finalCta.ref as RefObject<HTMLElement>}
            aria-labelledby="register-cta-heading"
            className={cn(
              'scroll-reveal py-16 text-center sm:py-24',
              finalCta.isVisible && 'is-visible'
            )}
          >
            <div className="mx-auto max-w-4xl px-4 sm:px-6">
              <h2 id="register-cta-heading" className="text-3xl font-bold text-white sm:text-4xl">
                Ready to step inside?
              </h2>
              <button
                type="button"
                onClick={() => authModal?.openAuthModal(undefined, 'register')}
                className="animate-shine mt-8 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-colors duration-base hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none"
              >
                Create Your Account
              </button>
              <p className="mt-4 text-sm text-white/60">
                No credit card. No commitment. Just peace.
              </p>
            </div>
          </section>
        </main>
      </GlowBackground>

      <SiteFooter />
    </div>
  )
}
