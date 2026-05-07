import { memo, useMemo } from 'react'

function createSeededRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0xffffffff
  }
}

interface Star {
  x: number
  y: number
  r: number
  opacity: number
  twinkleDelay?: number
  twinkleDuration?: number
}

interface CrossGlint {
  x: number
  y: number
  size: number
  opacity: number
  pulseDelay?: number
  pulseDuration?: number
}

interface GenerateStarsOptions {
  seed: number
  rMin: number
  rMax: number
  opacityMin: number
  opacityMax: number
  twinkleRatio: number
  avoidCenter?: boolean
  twinkleDurationRange?: [number, number]
}

function generateStars(count: number, opts: GenerateStarsOptions): Star[] {
  const random = createSeededRandom(opts.seed)
  const stars: Star[] = []
  let safety = 0
  const safetyLimit = count * 10

  while (stars.length < count && safety < safetyLimit) {
    safety++
    const x = random() * 1920
    const y = random() * 1080

    if (opts.avoidCenter) {
      const centerX = 960
      const halfBand = 1920 * 0.15
      if (Math.abs(x - centerX) < halfBand) continue
    }

    const r = opts.rMin + random() * (opts.rMax - opts.rMin)
    const opacity = opts.opacityMin + random() * (opts.opacityMax - opts.opacityMin)
    const willTwinkle = random() < opts.twinkleRatio

    const star: Star = { x, y, r, opacity }
    if (willTwinkle && opts.twinkleDurationRange) {
      const [dMin, dMax] = opts.twinkleDurationRange
      star.twinkleDuration = dMin + random() * (dMax - dMin)
      star.twinkleDelay = random() * 10
    }
    stars.push(star)
  }

  return stars
}

function generateCrossGlints(count: number, seed: number): CrossGlint[] {
  const random = createSeededRandom(seed)
  const glints: CrossGlint[] = []

  const anchors = [
    { x: 220, y: 180 },
    { x: 1700, y: 220 },
    { x: 180, y: 720 },
    { x: 1740, y: 780 },
    { x: 320, y: 420 },
    { x: 1600, y: 480 },
    { x: 280, y: 580 },
    { x: 1620, y: 620 },
  ]

  for (let i = 0; i < Math.min(count, anchors.length); i++) {
    const anchor = anchors[i]
    const x = anchor.x + (random() - 0.5) * 80
    const y = anchor.y + (random() - 0.5) * 80
    const size = 14 + random() * 14
    const opacity = 0.45 + random() * 0.20
    const willPulse = random() < 0.3

    const glint: CrossGlint = { x, y, size, opacity }
    if (willPulse) {
      glint.pulseDuration = 10 + random() * 5
      glint.pulseDelay = random() * 8
    }
    glints.push(glint)
  }

  return glints
}

export const CinematicHeroBackground = memo(function CinematicHeroBackground() {
  const farStars = useMemo(
    () =>
      generateStars(400, {
        seed: 0xc0ffee,
        rMin: 0.4,
        rMax: 0.9,
        opacityMin: 0.15,
        opacityMax: 0.5,
        twinkleRatio: 0,
      }),
    [],
  )

  const midStars = useMemo(
    () =>
      generateStars(200, {
        seed: 0xfade,
        rMin: 0.8,
        rMax: 1.4,
        opacityMin: 0.4,
        opacityMax: 0.75,
        twinkleRatio: 0.3,
        twinkleDurationRange: [4, 8],
      }),
    [],
  )

  const brightStars = useMemo(
    () =>
      generateStars(60, {
        seed: 0xbeef,
        rMin: 1.2,
        rMax: 2.5,
        opacityMin: 0.7,
        opacityMax: 1.0,
        twinkleRatio: 0.5,
        avoidCenter: true,
        twinkleDurationRange: [6, 12],
      }),
    [],
  )

  const crossGlints = useMemo(() => generateCrossGlints(10, 0xc1a55), [])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
      style={{
        height: 'calc(100% + 200px)',
        maskImage:
          'linear-gradient(to bottom, black 0%, black 35%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,0.50) 72%, rgba(0,0,0,0.20) 88%, transparent 100%)',
        WebkitMaskImage:
          'linear-gradient(to bottom, black 0%, black 35%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,0.50) 72%, rgba(0,0,0,0.20) 88%, transparent 100%)',
      }}
    >
      {/* Layer 0: solid dark base */}
      <div className="absolute inset-0 bg-hero-bg" />

      {/* Layer 1: deep nebula tint */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 40%, rgba(60, 40, 110, 0.15) 0%, rgba(40, 25, 80, 0.08) 30%, transparent 70%)',
        }}
      />

      {/* Layer 2: far stars */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
      >
        {farStars.map((s, i) => (
          <circle
            key={`far-${i}`}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill="white"
            opacity={s.opacity}
          />
        ))}
      </svg>

      {/* Layer 3: mid stars (some twinkle) */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
      >
        {midStars.map((s, i) => (
          <circle
            key={`mid-${i}`}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill="white"
            className={s.twinkleDuration ? 'cinematic-star-twinkle' : ''}
            style={
              s.twinkleDuration
                ? ({
                    opacity: s.opacity,
                    '--star-opacity': s.opacity,
                    '--twinkle-duration': `${s.twinkleDuration}s`,
                    '--twinkle-delay': `${s.twinkleDelay}s`,
                  } as React.CSSProperties)
                : { opacity: s.opacity }
            }
          />
        ))}
      </svg>

      {/* Layer 4: bright stars with halos */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
      >
        {brightStars.map((s, i) => (
          <g key={`bright-${i}`}>
            <circle
              cx={s.x}
              cy={s.y}
              r={s.r * 3.5}
              fill="white"
              opacity={s.opacity * 0.13}
              className={s.twinkleDuration ? 'cinematic-star-twinkle' : ''}
              style={
                s.twinkleDuration
                  ? ({
                      '--star-opacity': s.opacity * 0.13,
                      '--twinkle-duration': `${s.twinkleDuration}s`,
                      '--twinkle-delay': `${s.twinkleDelay}s`,
                    } as React.CSSProperties)
                  : undefined
              }
            />
            <circle
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill="white"
              opacity={s.opacity}
              className={s.twinkleDuration ? 'cinematic-star-twinkle' : ''}
              style={
                s.twinkleDuration
                  ? ({
                      '--star-opacity': s.opacity,
                      '--twinkle-duration': `${s.twinkleDuration}s`,
                      '--twinkle-delay': `${s.twinkleDelay}s`,
                    } as React.CSSProperties)
                  : undefined
              }
            />
          </g>
        ))}
      </svg>

      {/* Layer 5: cross-glint stars */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
      >
        {crossGlints.map((g, i) => {
          const halfSize = g.size / 2
          const className = g.pulseDuration ? 'cinematic-glint-pulse' : ''
          const style = g.pulseDuration
            ? ({
                '--glint-opacity': g.opacity,
                '--pulse-duration': `${g.pulseDuration}s`,
                '--pulse-delay': `${g.pulseDelay}s`,
              } as React.CSSProperties)
            : { opacity: g.opacity }

          return (
            <g key={`glint-${i}`} className={className} style={style}>
              <rect
                x={g.x - halfSize}
                y={g.y - 0.3}
                width={g.size}
                height={0.6}
                fill="white"
              />
              <rect
                x={g.x - 0.3}
                y={g.y - halfSize}
                width={0.6}
                height={g.size}
                fill="white"
              />
              <circle cx={g.x} cy={g.y} r={1.5} fill="white" />
            </g>
          )
        })}
      </svg>

      {/* Layer 6: warm directional beam from top-left */}
      <div className="absolute inset-0 cinematic-light-beam" />

      {/* Layer 7: film grain */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.04]"
        style={{ mixBlendMode: 'overlay' }}
      >
        <filter id="cinematic-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="1.2"
            numOctaves="2"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#cinematic-grain)" />
      </svg>

    </div>
  )
})
