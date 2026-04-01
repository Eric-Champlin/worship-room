import type { SkyConfig } from './gardenTimeOfDay'

const STAR_POSITIONS = [
  { cx: 120, cy: 60, r: 2 },
  { cx: 280, cy: 45, r: 1.5 },
  { cx: 450, cy: 70, r: 2.5 },
  { cx: 580, cy: 35, r: 1.5 },
  { cx: 350, cy: 90, r: 2 },
  { cx: 700, cy: 55, r: 1.5 },
  { cx: 200, cy: 30, r: 2 },
  { cx: 520, cy: 85, r: 2 },
]

const FIREFLY_POSITIONS = [
  { cx: 180, cy: 320 },
  { cx: 400, cy: 340 },
  { cx: 600, cy: 310 },
]

export function NightSky({
  skyConfig,
  prefersReduced,
  skyTopColor,
}: {
  skyConfig: SkyConfig
  prefersReduced: boolean
  skyTopColor: string
}) {
  const { starCount, fireflyCount, showMoon } = skyConfig

  if (starCount === 0 && !showMoon && fireflyCount === 0) return null

  return (
    <g data-testid="garden-night-sky">
      {/* Stars */}
      {STAR_POSITIONS.slice(0, starCount).map((star, i) => (
        <circle
          key={`star-${i}`}
          cx={star.cx}
          cy={star.cy}
          r={star.r}
          fill="#FFFFFF"
          opacity={prefersReduced ? 0.5 : 0.3}
          className={prefersReduced ? undefined : 'motion-safe:animate-garden-star-twinkle'}
          style={prefersReduced ? undefined : { animationDelay: `${i * 0.5}s` }}
          data-testid="garden-star"
        />
      ))}

      {/* Moon (crescent: outer white circle + inner circle matching sky color) */}
      {showMoon && (
        <g data-testid="garden-moon">
          <circle cx="680" cy="80" r="20" fill="#FEFCE8" opacity={0.8} />
          <circle cx="688" cy="75" r="18" fill={skyTopColor} />
        </g>
      )}

      {/* Fireflies */}
      {FIREFLY_POSITIONS.slice(0, fireflyCount).map((ff, i) => (
        <circle
          key={`firefly-${i}`}
          cx={ff.cx}
          cy={ff.cy}
          r={2}
          fill="#BEF264"
          opacity={prefersReduced ? 0.3 : 0.2}
          className={prefersReduced ? undefined : 'motion-safe:animate-garden-firefly-glow'}
          style={prefersReduced ? undefined : { animationDelay: `${i * 1.5}s` }}
          data-testid="garden-firefly"
        />
      ))}
    </g>
  )
}
