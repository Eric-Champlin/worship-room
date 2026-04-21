import { GlowBackground } from './GlowBackground'
import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { cn } from '@/lib/utils'

const STATS = [
  { value: 66, label: 'Bible Books' },
  { value: 50, label: 'Devotionals' },
  { value: 10, label: 'Reading Plans' },
  { value: 24, label: 'Ambient Sounds' },
  { value: 6, label: 'Meditation Types' },
  { value: 5, label: 'Seasonal Challenges' },
  { value: 8, label: 'Worship Playlists' },
  { value: 12, label: 'Bedtime Stories' },
] as const

function StatItem({
  value,
  label,
  index,
  isVisible,
}: {
  value: number
  label: string
  index: number
  isVisible: boolean
}) {
  const count = useAnimatedCounter({
    target: value,
    duration: 800,
    delay: index * 80,
    enabled: isVisible,
  })

  return (
    <div
      className={cn('scroll-reveal text-center', isVisible && 'is-visible')}
      style={staggerDelay(index)}
    >
      <div
        className="text-3xl sm:text-4xl lg:text-5xl font-bold"
        style={GRADIENT_TEXT_STYLE}
        aria-label={`${value} ${label}`}
      >
        {count}
      </div>
      <div className="text-white/90 text-xs sm:text-sm mt-1 tracking-wide uppercase">
        {label}
      </div>
    </div>
  )
}

export function StatsBar() {
  const { ref, isVisible } = useScrollReveal()

  return (
    <GlowBackground variant="none">
      {/* Elliptical glow — behind stat numbers */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[180px] md:w-[700px] md:h-[300px] rounded-full blur-[45px] md:blur-[60px] will-change-transform animate-glow-float motion-reduce:animate-none"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.30) 0%, rgba(139, 92, 246, 0.12) 40%, transparent 70%)',
        }}
      />
      <section
        ref={ref as React.RefObject<HTMLElement>}
        aria-label="Content statistics"
        className=""
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
            {STATS.map((stat, i) => (
              <StatItem
                key={stat.label}
                value={stat.value}
                label={stat.label}
                index={i}
                isVisible={isVisible}
              />
            ))}
          </div>
        </div>
      </section>
    </GlowBackground>
  )
}
