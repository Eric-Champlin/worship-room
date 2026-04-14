import { Lock, Check, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'
import { WHITE_PURPLE_GRADIENT } from '@/constants/gradients'
import { GlowBackground } from './GlowBackground'
import { SectionHeading } from './SectionHeading'
import { PREVIEW_CARDS, getHeatmapColor, PRACTICES, FRIENDS } from './dashboard-preview-data'

// --- Preview Sub-Components (internal, not exported) ---

function MoodInsightsPreview() {
  return (
    <div aria-hidden="true">
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }, (_, i) => {
          const row = Math.floor(i / 7)
          const col = i % 7
          return (
            <div
              key={i}
              className={cn('h-3 w-3 rounded-sm sm:h-4 sm:w-4', getHeatmapColor(row, col))}
            />
          )
        })}
      </div>
      <p className="mt-2 text-xs text-white/40">Last 35 days</p>
    </div>
  )
}

function StreakPreview() {
  return (
    <div className="flex flex-col items-center gap-2" aria-hidden="true">
      <div className="flex items-baseline gap-2">
        <Flame className="h-6 w-6 text-amber-400" />
        <span className="text-3xl font-bold text-white">14</span>
      </div>
      <p className="text-sm text-white/50">day streak</p>
      <div className="h-2 w-full rounded-full bg-white/[0.08]">
        <div className="h-2 w-[65%] rounded-full bg-purple-500" />
      </div>
      <p className="text-xs text-white/40">Level 3 · 1,240 pts</p>
    </div>
  )
}

function GardenPreview() {
  return (
    <div className="flex items-center justify-center" aria-hidden="true">
      <svg viewBox="0 0 120 80" className="h-full w-full max-h-[100px]" aria-hidden="true">
        {/* Ground */}
        <ellipse cx="60" cy="75" rx="50" ry="8" fill="rgba(34,197,94,0.15)" />
        {/* Stem */}
        <path d="M60,72 Q58,50 60,30" stroke="rgba(34,197,94,0.6)" strokeWidth="2" fill="none" />
        {/* Leaves */}
        <ellipse cx="52" cy="55" rx="8" ry="4" fill="rgba(34,197,94,0.4)" transform="rotate(-30,52,55)" />
        <ellipse cx="68" cy="48" rx="8" ry="4" fill="rgba(34,197,94,0.5)" transform="rotate(25,68,48)" />
        <ellipse cx="54" cy="40" rx="7" ry="3.5" fill="rgba(34,197,94,0.35)" transform="rotate(-20,54,40)" />
        <ellipse cx="66" cy="33" rx="7" ry="3.5" fill="rgba(34,197,94,0.45)" transform="rotate(15,66,33)" />
        {/* Sun */}
        <circle cx="95" cy="15" r="8" fill="rgba(250,204,21,0.3)" />
        <circle cx="95" cy="15" r="4" fill="rgba(250,204,21,0.5)" />
      </svg>
    </div>
  )
}

function PracticesPreview() {
  return (
    <div className="space-y-1.5" aria-hidden="true">
      {PRACTICES.map((p) => (
        <div key={p.label} className="flex items-center gap-2">
          <div className={cn(
            'flex h-4 w-4 items-center justify-center rounded',
            p.done ? 'bg-emerald-500/60' : 'bg-white/[0.08]'
          )}>
            {p.done && <Check className="h-3 w-3 text-white" />}
          </div>
          <span className={cn('text-xs', p.done ? 'text-white/50 line-through' : 'text-white/60')}>
            {p.label}
          </span>
        </div>
      ))}
      <p className="mt-1 text-xs text-white/40">2 of 5 complete</p>
    </div>
  )
}

function FriendsPreview() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {FRIENDS.map((f) => (
        <div key={f.name} className="flex items-center gap-2">
          <div className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white', f.color)}>
            {f.name[0]}
          </div>
          <span className="flex-1 text-xs text-white/60">{f.name}</span>
          <span className="text-[10px] text-white/40">{'\u{1F525}'} {f.streak}</span>
        </div>
      ))}
      <p className="mt-1 text-xs text-white/40">3 friends praying with you</p>
    </div>
  )
}

const STEPS = ['Mood', 'Highlights', 'Gratitude', 'Prayer']

function EveningReflectionPreview() {
  return (
    <div aria-hidden="true">
      <div className="flex items-center justify-between gap-1">
        {STEPS.map((step, i) => (
          <div key={step} className="flex flex-col items-center gap-1">
            <div className={cn(
              'h-3 w-3 rounded-full',
              i < 2 ? 'bg-purple-400' : 'bg-white/[0.08]'
            )} />
            <span className="text-[10px] text-white/40">{step}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-white/40">Wind down your day with intention</p>
    </div>
  )
}

// --- Lock Overlay ---

function LockOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[3px] bg-hero-bg/50">
      <Lock className="w-5 h-5 text-white/40" aria-hidden="true" />
    </div>
  )
}

// --- Preview Map ---

const PREVIEW_MAP: Record<string, () => JSX.Element> = {
  mood: MoodInsightsPreview,
  streak: StreakPreview,
  garden: GardenPreview,
  practices: PracticesPreview,
  friends: FriendsPreview,
  evening: EveningReflectionPreview,
}

// --- Main Component ---

export function DashboardPreview() {
  const authModal = useAuthModal()
  const { ref, isVisible } = useScrollReveal()

  return (
    <GlowBackground variant="none">
      {/* Primary glow — dramatic three-stop gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-[40%] -translate-y-1/2 w-[540px] h-[360px] md:w-[900px] md:h-[600px] rounded-full blur-[45px] md:blur-[60px] will-change-transform animate-glow-float motion-reduce:animate-none"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.40) 0%, rgba(139, 92, 246, 0.15) 35%, rgba(139, 92, 246, 0.05) 55%, transparent 70%)',
        }}
      />
      {/* Secondary offset glow — lighter violet */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[5%] top-[30%] -translate-y-1/2 w-[240px] h-[240px] md:w-[400px] md:h-[400px] rounded-full blur-[48px] md:blur-[80px] will-change-transform animate-glow-float motion-reduce:animate-none"
        style={{
          background: 'radial-gradient(circle, rgba(168, 130, 255, 0.25) 0%, transparent 70%)',
        }}
      />
      <section aria-label="Dashboard preview">
        <div ref={ref as React.RefObject<HTMLDivElement>} className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          {/* Heading */}
          <div
            className={cn('scroll-reveal', isVisible && 'is-visible')}
            style={staggerDelay(0, 100, 0)}
          >
            <SectionHeading
              topLine="See How You're"
              bottomLine="Growing"
              tagline="Create a free account and unlock your personal dashboard."
            />
          </div>

          {/* Card Grid */}
          <div className="mt-12 grid grid-cols-1 gap-5 sm:mt-16 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 auto-rows-fr">
            {PREVIEW_CARDS.map((card, index) => {
              const Preview = PREVIEW_MAP[card.id]
              const Icon = card.icon
              return (
                <div
                  key={card.id}
                  className={cn('scroll-reveal h-full', isVisible && 'is-visible')}
                  style={staggerDelay(index, 100, 200)}
                >
                  <div className="bg-white/[0.04] border border-white/[0.12] rounded-2xl overflow-hidden h-full flex flex-col">
                    {/* Top area — Preview mockup with lock overlay */}
                    <div className="relative bg-white/[0.02] min-h-[160px] sm:min-h-[180px] px-4 py-4">
                      <div className={cn(
                        'flex h-full flex-col justify-center',
                        ['mood', 'streak', 'garden', 'evening'].includes(card.id) && 'items-center'
                      )}>
                        <Preview />
                      </div>
                      <LockOverlay />
                    </div>
                    {/* Divider */}
                    <div className="border-b border-white/[0.06]" />
                    {/* Bottom area — Icon + title + description in clear text */}
                    <div className="p-4 sm:p-5">
                      <div className="flex items-center gap-2">
                        <Icon className={cn('h-4 w-4', card.iconColor)} aria-hidden="true" />
                        <h3 className="text-white font-semibold text-sm sm:text-base">{card.title}</h3>
                      </div>
                      <p className="text-white/90 text-xs sm:text-sm leading-relaxed mt-2">{card.description}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* CTA */}
          <div
            className={cn('scroll-reveal mt-12 text-center sm:mt-16', isVisible && 'is-visible')}
            style={staggerDelay(0, 100, 800)}
          >
            <p className="mb-4 text-base text-white">
              It's free. No catch.
            </p>
            <button
              type="button"
              onClick={() => authModal?.openAuthModal(undefined, 'register')}
              className={cn(
                'inline-flex w-full items-center justify-center rounded-full px-8 py-3 text-base font-semibold text-hero-bg sm:w-auto',
                'shadow-[0_0_20px_rgba(255,255,255,0.15)]',
                'transition-all motion-reduce:transition-none hover:shadow-lg hover:brightness-110',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                'active:scale-[0.98]'
              )}
              style={{ background: WHITE_PURPLE_GRADIENT }}
            >
              Create a Free Account
            </button>
          </div>
        </div>
      </section>
    </GlowBackground>
  )
}
