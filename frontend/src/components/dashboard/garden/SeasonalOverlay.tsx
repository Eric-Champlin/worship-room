import type { SeasonalOverlayConfig } from './gardenSeasons'

const SNOW_PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  cx: 30 + ((i * 43) % 740),
  cy: 20 + ((i * 17) % 100), // static positions for reduced-motion
  r: 1.5 + (i % 3) * 0.5,
  delay: (i * 0.45) % 8,
}))

const EASTER_FLOWER_POSITIONS = [
  { cx: 150, cy: 345 },
  { cx: 280, cy: 350 },
  { cx: 380, cy: 340 },
  { cx: 500, cy: 355 },
  { cx: 620, cy: 345 },
]

export function SeasonalOverlay({
  config,
  prefersReduced,
}: {
  config: SeasonalOverlayConfig
  prefersReduced: boolean
}) {
  const hasOverlay =
    config.showSnow ||
    config.showGroundSnow ||
    config.showStar ||
    config.showFlowers ||
    config.showCross ||
    config.showWarmGlow

  if (!hasOverlay) return null

  return (
    <g
      data-testid="garden-seasonal-overlay"
      className={prefersReduced ? undefined : 'motion-safe:animate-garden-seasonal-fade'}
    >
      {/* Snow particles (Advent/Christmas) */}
      {config.showSnow &&
        SNOW_PARTICLES.map((s, i) => (
          <circle
            key={`snow-${i}`}
            cx={s.cx}
            cy={prefersReduced ? s.cy : -10}
            r={s.r}
            fill="#FFFFFF"
            opacity={prefersReduced ? 0.5 : 0}
            className={prefersReduced ? undefined : 'motion-safe:animate-garden-snow-fall'}
            style={prefersReduced ? undefined : { animationDelay: `${s.delay}s` }}
            data-testid="garden-snow"
          />
        ))}

      {/* Ground snow (Christmas) */}
      {config.showGroundSnow && (
        <path
          d="M0,340 C100,335 200,342 300,336 C400,330 500,340 600,334 C700,330 800,338 800,400 L0,400 Z"
          fill="#FFFFFF"
          opacity={0.15}
          data-testid="garden-ground-snow"
        />
      )}

      {/* Star of Bethlehem (Advent/Christmas) */}
      {config.showStar && (
        <g data-testid="garden-bethlehem-star" opacity={config.starBrightness}>
          <polygon
            points="400,25 404,38 418,38 407,46 411,60 400,52 389,60 393,46 382,38 396,38"
            fill="#FBBF24"
          />
        </g>
      )}

      {/* Easter flowers */}
      {config.showFlowers &&
        EASTER_FLOWER_POSITIONS.map((pos, i) => (
          <g
            key={`flower-${i}`}
            className={prefersReduced ? undefined : 'motion-safe:animate-garden-element-fade'}
            style={prefersReduced ? undefined : { animationDelay: `${i * 500}ms` }}
            data-testid="garden-easter-flower"
          >
            <circle cx={pos.cx} cy={pos.cy} r={6} fill="#F472B6" />
            <circle cx={pos.cx} cy={pos.cy} r={3} fill="#FBBF24" />
          </g>
        ))}

      {/* Holy Week cross */}
      {config.showCross && (
        <g data-testid="garden-cross" opacity={0.15}>
          <rect x="398" y="110" width="4" height="20" fill="#FFFFFF" />
          <rect x="394" y="116" width="12" height="4" fill="#FFFFFF" />
        </g>
      )}

      {/* Warm glow (Christmas/Pentecost) */}
      {config.showWarmGlow && (
        <ellipse
          cx="400"
          cy="380"
          rx="300"
          ry="60"
          fill="#FBBF24"
          opacity={0.06}
          className={prefersReduced ? undefined : 'motion-safe:animate-garden-flame-flicker'}
          data-testid="garden-warm-glow"
        />
      )}
    </g>
  )
}
