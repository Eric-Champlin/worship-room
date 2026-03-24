import { useEffect, useId, useRef, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

// --- Types ---

export interface GrowthGardenProps {
  stage: 1 | 2 | 3 | 4 | 5 | 6
  animated?: boolean
  showSparkle?: boolean
  streakActive?: boolean
  size: 'sm' | 'md' | 'lg'
  amplifiedSparkle?: boolean
}

// --- Constants ---

const SIZE_CLASSES = {
  sm: 'h-[150px]',
  md: 'h-[200px]',
  lg: 'h-[300px]',
} as const

export const STAGE_LABELS: Record<number, string> = {
  1: 'Your garden: a tiny sprout in bare soil',
  2: 'Your garden: a small plant with leaves and a flower bud',
  3: 'Your garden: a flowering bush with butterflies',
  4: 'Your garden: a young tree with flowers and a bird',
  5: 'Your garden: a strong oak tree with fruit and a stream',
  6: 'Your garden: a glowing oak tree in a full garden with a bench',
}

// Color palette matching design system
const C = {
  purple: '#6D28D9',
  purpleLt: '#A78BFA',
  amber: '#D97706',
  amberLt: '#FBBF24',
  teal: '#2DD4BF',
  green: '#34D399',
  earthDk: '#5C4033',
  earthMd: '#6B4E1B',
  earthLt: '#8B6914',
  leafBrt: '#22C55E',
  leafMd: '#16A34A',
  leafDk: '#15803D',
  streamLt: '#60A5FA',
  streamDk: '#3B82F6',
} as const

// --- Shared SVG Sub-Components ---

function SkyBackground({ uid, streakActive }: { uid: string; streakActive: boolean }) {
  const skyTop = streakActive ? '#0D0620' : '#1a1025'
  const skyBot = streakActive ? '#1E0B3E' : '#2a1845'
  return (
    <>
      <defs>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skyTop} />
          <stop offset="100%" stopColor={skyBot} />
        </linearGradient>
      </defs>
      <rect width="800" height="400" fill={`url(#sky-${uid})`} />
    </>
  )
}

function SkyElements({ streakActive }: { streakActive: boolean }) {
  if (streakActive) {
    return (
      <g data-testid="garden-sun">
        <circle cx="680" cy="80" r="50" fill="rgba(255,255,255,0.08)" />
        <circle cx="680" cy="80" r="30" fill="rgba(255,255,255,0.6)" />
      </g>
    )
  }
  return (
    <g data-testid="garden-clouds">
      <ellipse cx="200" cy="100" rx="60" ry="25" fill="rgba(255,255,255,0.15)" />
      <ellipse cx="240" cy="88" rx="45" ry="20" fill="rgba(255,255,255,0.12)" />
      <ellipse cx="550" cy="115" rx="65" ry="22" fill="rgba(255,255,255,0.15)" />
      <ellipse cx="590" cy="105" rx="50" ry="18" fill="rgba(255,255,255,0.12)" />
      <ellipse cx="680" cy="80" rx="40" ry="18" fill="rgba(255,255,255,0.1)" />
    </g>
  )
}

function GroundLayer({ uid, stage }: { uid: string; stage: number }) {
  const topColor = stage >= 4 ? '#1a4a15' : stage >= 3 ? '#2d5a27' : stage >= 2 ? '#4a3520' : C.earthMd
  return (
    <>
      <defs>
        <linearGradient id={`ground-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={topColor} />
          <stop offset="100%" stopColor={C.earthDk} />
        </linearGradient>
      </defs>
      <path
        d="M0,300 C100,292 200,296 300,290 C400,284 500,294 600,288 C700,282 750,292 800,287 L800,400 L0,400 Z"
        fill={`url(#ground-${uid})`}
      />
      <path
        d="M0,330 C200,325 400,332 600,326 C700,323 800,328 800,400 L0,400 Z"
        fill={C.earthDk}
        opacity={0.3}
      />
    </>
  )
}

// --- Helpers ---

function GrassBlades({ positions }: { positions: Array<{ x: number; h: number }> }) {
  return (
    <g>
      {positions.map(({ x, h }, i) => (
        <path
          key={i}
          d={`M${x},${296 - (i % 3)} L${x + 2},${296 - h} L${x + 4},${296 - (i % 3)}`}
          fill={i % 2 === 0 ? C.leafBrt : C.leafMd}
          opacity={0.5 + (i % 3) * 0.15}
        />
      ))}
    </g>
  )
}

function Flower({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
  const lightMap: Record<string, string> = {
    [C.purple]: C.purpleLt,
    [C.amber]: C.amberLt,
    [C.teal]: '#5EEAD4',
    [C.green]: '#6EE7B7',
  }
  const light = lightMap[color] ?? color
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={color} />
      <circle cx={cx} cy={cy} r={r * 0.5} fill={light} />
    </g>
  )
}

function ButterflyShape({
  x,
  y,
  color,
  animated,
  delay,
}: {
  x: number
  y: number
  color: string
  animated: boolean
  delay?: string
}) {
  return (
    <g
      className={animated ? 'garden-butterfly motion-safe:animate-garden-butterfly-float' : ''}
      style={{ transformOrigin: `${x}px ${y}px`, ...(delay ? { animationDelay: delay } : {}) }}
    >
      <path
        d={`M${x},${y} Q${x - 8},${y - 10} ${x - 2},${y - 14} Q${x - 1},${y - 8} ${x},${y}`}
        fill={color}
        opacity={0.8}
      />
      <path
        d={`M${x},${y} Q${x + 8},${y - 10} ${x + 2},${y - 14} Q${x + 1},${y - 8} ${x},${y}`}
        fill={color}
        opacity={0.6}
      />
      <line x1={x} y1={y} x2={x} y2={y + 3} stroke={C.earthMd} strokeWidth="0.5" />
    </g>
  )
}

function BirdShape({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path
        d={`M${x - 6},${y} Q${x - 3},${y - 4} ${x},${y}`}
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d={`M${x},${y} Q${x + 3},${y - 4} ${x + 6},${y}`}
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </g>
  )
}

function SunlightRays({ streakActive }: { streakActive: boolean }) {
  if (!streakActive) return null
  return (
    <g opacity={0.12}>
      <line x1="680" y1="80" x2="500" y2="250" stroke="rgba(255,255,255,0.6)" strokeWidth="3" />
      <line x1="680" y1="80" x2="550" y2="300" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" />
      <line x1="680" y1="80" x2="600" y2="280" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
      <line x1="680" y1="80" x2="450" y2="290" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
    </g>
  )
}

// --- Stage 1: Seedling ---

function SeedlingScene() {
  return (
    <g data-testid="garden-stage-1">
      {/* Soil mound */}
      <ellipse cx="400" cy="294" rx="35" ry="10" fill={C.earthMd} />
      <ellipse cx="400" cy="294" rx="25" ry="7" fill={C.earthLt} opacity={0.3} />

      {/* Tiny sprout */}
      <line x1="400" y1="294" x2="400" y2="272" stroke={C.leafBrt} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M400,280 C394,274 386,276 385,280 C388,278 394,276 400,280" fill={C.leafBrt} />
      <path d="M400,276 C406,270 414,272 415,276 C412,274 406,272 400,276" fill={C.leafBrt} />

      {/* Cross marker */}
      <line x1="355" y1="300" x2="355" y2="288" stroke={C.earthLt} strokeWidth="2" strokeLinecap="round" />
      <line x1="349" y1="294" x2="361" y2="294" stroke={C.earthLt} strokeWidth="2" strokeLinecap="round" />
    </g>
  )
}

// --- Stage 2: Sprout ---

function SproutScene() {
  return (
    <g data-testid="garden-stage-2">
      {/* Stem */}
      <path
        d="M400,294 C399,275 398,260 400,242"
        fill="none"
        stroke={C.leafMd}
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Leaves */}
      <path d="M400,272 C392,264 383,268 382,274 C388,270 394,268 400,272" fill={C.leafBrt} />
      <path d="M400,258 C408,250 417,254 418,260 C412,256 406,254 400,258" fill={C.leafMd} />
      <path d="M400,282 C408,276 416,280 416,284 C412,280 406,278 400,282" fill={C.leafBrt} />

      {/* Flower bud */}
      <circle cx="400" cy="238" r="5" fill={C.purple} />
      <circle cx="400" cy="238" r="2.5" fill={C.purpleLt} />

      {/* Grass patches */}
      <GrassBlades
        positions={[
          { x: 365, h: 14 },
          { x: 380, h: 10 },
          { x: 420, h: 12 },
          { x: 435, h: 15 },
          { x: 345, h: 8 },
          { x: 455, h: 10 },
        ]}
      />
    </g>
  )
}

// --- Stage 3: Blooming ---

function BloomingScene({ animated }: { animated: boolean }) {
  return (
    <g data-testid="garden-stage-3">
      {/* Bush stems */}
      <line x1="388" y1="294" x2="382" y2="262" stroke={C.earthMd} strokeWidth="3" />
      <line x1="400" y1="294" x2="400" y2="255" stroke={C.earthMd} strokeWidth="3.5" />
      <line x1="412" y1="294" x2="418" y2="262" stroke={C.earthMd} strokeWidth="3" />

      {/* Bush foliage */}
      <ellipse cx="400" cy="256" rx="55" ry="38" fill={C.leafDk} />
      <ellipse cx="388" cy="250" rx="38" ry="30" fill={C.leafMd} />
      <ellipse cx="416" cy="248" rx="40" ry="32" fill={C.leafBrt} opacity={0.8} />

      {/* Swaying leaf layer */}
      <g
        className={animated ? 'garden-leaf motion-safe:animate-garden-leaf-sway' : ''}
        style={{ transformOrigin: '400px 250px' }}
      >
        <ellipse cx="400" cy="244" rx="32" ry="24" fill={C.leafMd} opacity={0.7} />
      </g>

      {/* 4 flowers */}
      <Flower cx={378} cy={238} r={7} color={C.purple} />
      <Flower cx={410} cy={232} r={8} color={C.purple} />
      <Flower cx={428} cy={245} r={6} color={C.purple} />
      <Flower cx={393} cy={250} r={7} color={C.amber} />

      {/* Butterflies */}
      <ButterflyShape x={310} y={200} color={C.amber} animated={animated} />
      <ButterflyShape x={490} y={215} color={C.teal} animated={animated} delay="2s" />

      {/* Grass */}
      <GrassBlades
        positions={[
          { x: 330, h: 15 },
          { x: 345, h: 12 },
          { x: 360, h: 14 },
          { x: 440, h: 13 },
          { x: 455, h: 16 },
          { x: 470, h: 11 },
          { x: 310, h: 10 },
          { x: 490, h: 12 },
        ]}
      />
    </g>
  )
}

// --- Stage 4: Flourishing ---

function FlourishingScene({ animated, streakActive }: { animated: boolean; streakActive: boolean }) {
  return (
    <g data-testid="garden-stage-4">
      <SunlightRays streakActive={streakActive} />

      {/* Trunk */}
      <path d="M393,294 L397,210 L403,210 L407,294 Z" fill={C.earthMd} />
      <path d="M395,294 L398,220 L402,220 L405,294 Z" fill={C.earthLt} opacity={0.3} />

      {/* Branches */}
      <line x1="397" y1="240" x2="360" y2="225" stroke={C.earthMd} strokeWidth="3" strokeLinecap="round" />
      <line x1="403" y1="230" x2="440" y2="218" stroke={C.earthMd} strokeWidth="3" strokeLinecap="round" />

      {/* Canopy */}
      <g
        className={animated ? 'garden-leaf motion-safe:animate-garden-leaf-sway' : ''}
        style={{ transformOrigin: '400px 195px' }}
      >
        <ellipse cx="400" cy="195" rx="75" ry="55" fill={C.leafDk} />
        <ellipse cx="385" cy="190" rx="55" ry="42" fill={C.leafMd} />
        <ellipse cx="415" cy="188" rx="58" ry="45" fill={C.leafBrt} opacity={0.7} />
        <ellipse cx="400" cy="185" rx="45" ry="35" fill={C.leafMd} opacity={0.6} />
      </g>

      {/* Flowers at base */}
      <Flower cx={350} cy={290} r={5} color={C.purple} />
      <Flower cx={365} cy={288} r={4} color={C.amber} />
      <Flower cx={435} cy={289} r={5} color={C.teal} />
      <Flower cx={450} cy={291} r={4} color={C.green} />
      <Flower cx={380} cy={292} r={3.5} color={C.purple} />
      <Flower cx={420} cy={290} r={4} color={C.amber} />

      {/* Bird on branch */}
      <BirdShape x={445} y={215} />

      {/* Grass */}
      <GrassBlades
        positions={[
          { x: 320, h: 14 },
          { x: 340, h: 16 },
          { x: 355, h: 12 },
          { x: 445, h: 15 },
          { x: 460, h: 13 },
          { x: 475, h: 16 },
          { x: 300, h: 10 },
          { x: 500, h: 11 },
        ]}
      />
    </g>
  )
}

// --- Stage 5: Oak ---

function OakScene({ animated, streakActive }: { uid: string; animated: boolean; streakActive: boolean }) {
  return (
    <g data-testid="garden-stage-5">
      <SunlightRays streakActive={streakActive} />

      {/* Stream */}
      <g className={animated ? 'garden-water motion-safe:animate-garden-water-shimmer' : ''}>
        <path
          d="M200,310 C250,305 280,315 320,308 C360,302 400,312 440,306 C480,300 520,310 560,304 C600,298 640,308 700,302"
          fill="none"
          stroke={C.streamLt}
          strokeWidth="8"
          strokeLinecap="round"
          opacity={0.6}
        />
        <path
          d="M220,316 C260,312 290,320 330,314 C370,308 410,318 450,312 C490,306 530,316 570,310 C610,304 650,314 690,308"
          fill="none"
          stroke={C.streamDk}
          strokeWidth="5"
          strokeLinecap="round"
          opacity={0.4}
        />
      </g>

      {/* Thick trunk */}
      <path d="M387,294 L392,190 L408,190 L413,294 Z" fill={C.earthMd} />
      <path d="M390,294 L394,200 L406,200 L410,294 Z" fill={C.earthLt} opacity={0.2} />
      {/* Roots */}
      <path d="M387,294 C380,296 375,298 370,300" fill="none" stroke={C.earthMd} strokeWidth="4" strokeLinecap="round" />
      <path d="M413,294 C420,296 425,298 430,300" fill="none" stroke={C.earthMd} strokeWidth="4" strokeLinecap="round" />

      {/* Branches */}
      <line x1="392" y1="235" x2="340" y2="215" stroke={C.earthMd} strokeWidth="4" strokeLinecap="round" />
      <line x1="408" y1="225" x2="460" y2="208" stroke={C.earthMd} strokeWidth="4" strokeLinecap="round" />
      <line x1="395" y1="210" x2="355" y2="185" stroke={C.earthMd} strokeWidth="3" strokeLinecap="round" />
      <line x1="405" y1="205" x2="445" y2="180" stroke={C.earthMd} strokeWidth="3" strokeLinecap="round" />

      {/* Wide canopy */}
      <g
        className={animated ? 'garden-leaf motion-safe:animate-garden-leaf-sway' : ''}
        style={{ transformOrigin: '400px 180px' }}
      >
        <ellipse cx="400" cy="180" rx="100" ry="70" fill={C.leafDk} />
        <ellipse cx="380" cy="175" rx="72" ry="52" fill={C.leafMd} />
        <ellipse cx="420" cy="172" rx="75" ry="55" fill={C.leafBrt} opacity={0.6} />
        <ellipse cx="400" cy="170" rx="60" ry="42" fill={C.leafMd} opacity={0.5} />
        <ellipse cx="360" cy="185" rx="40" ry="30" fill={C.leafDk} opacity={0.5} />
        <ellipse cx="440" cy="182" rx="42" ry="32" fill={C.leafDk} opacity={0.5} />
      </g>

      {/* Fruit */}
      <circle cx="360" cy="205" r="5" fill={C.amber} />
      <circle cx="440" cy="200" r="5" fill={C.teal} />
      <circle cx="380" cy="215" r="4" fill={C.amber} />
      <circle cx="420" cy="210" r="4" fill={C.teal} />

      {/* Wildflowers */}
      <Flower cx={280} cy={294} r={5} color={C.purple} />
      <Flower cx={300} cy={292} r={4} color={C.amber} />
      <Flower cx={320} cy={295} r={3.5} color={C.teal} />
      <Flower cx={480} cy={293} r={5} color={C.purple} />
      <Flower cx={500} cy={295} r={4} color={C.green} />
      <Flower cx={520} cy={292} r={3.5} color={C.amber} />
      <Flower cx={340} cy={290} r={3} color={C.green} />
      <Flower cx={460} cy={291} r={3} color={C.teal} />

      {/* Birds */}
      <BirdShape x={330} y={160} />
      <BirdShape x={470} y={150} />
      <BirdShape x={550} y={170} />

      {/* Butterflies */}
      <ButterflyShape x={280} y={220} color={C.amber} animated={animated} />
      <ButterflyShape x={520} y={200} color={C.teal} animated={animated} delay="1.5s" />
      <ButterflyShape x={350} y={170} color={C.green} animated={animated} delay="3s" />

      {/* Grass */}
      <GrassBlades
        positions={[
          { x: 260, h: 14 },
          { x: 280, h: 16 },
          { x: 300, h: 13 },
          { x: 340, h: 15 },
          { x: 460, h: 14 },
          { x: 480, h: 16 },
          { x: 500, h: 12 },
          { x: 540, h: 14 },
        ]}
      />
    </g>
  )
}

// --- Stage 6: Lighthouse ---

function LighthouseScene({ uid, animated, streakActive }: { uid: string; animated: boolean; streakActive: boolean }) {
  return (
    <g data-testid="garden-stage-6">
      <SunlightRays streakActive={streakActive} />

      {/* Stream */}
      <g className={animated ? 'garden-water motion-safe:animate-garden-water-shimmer' : ''}>
        <path
          d="M180,312 C220,306 260,316 300,310 C340,304 380,314 420,308 C460,302 500,312 540,306 C580,300 620,310 680,304"
          fill="none"
          stroke={C.streamLt}
          strokeWidth="9"
          strokeLinecap="round"
          opacity={0.6}
        />
        <path
          d="M200,318 C240,313 280,322 320,316 C360,310 400,320 440,314 C480,308 520,318 560,312 C600,306 640,316 700,310"
          fill="none"
          stroke={C.streamDk}
          strokeWidth="6"
          strokeLinecap="round"
          opacity={0.4}
        />
      </g>

      {/* Thick trunk */}
      <path d="M385,294 L390,185 L410,185 L415,294 Z" fill={C.earthMd} />
      <path d="M388,294 L393,195 L407,195 L412,294 Z" fill={C.earthLt} opacity={0.2} />
      {/* Roots */}
      <path d="M385,294 C376,297 368,300 360,304" fill="none" stroke={C.earthMd} strokeWidth="5" strokeLinecap="round" />
      <path d="M415,294 C424,297 432,300 440,304" fill="none" stroke={C.earthMd} strokeWidth="5" strokeLinecap="round" />
      <path d="M388,296 C382,300 378,305 376,308" fill="none" stroke={C.earthMd} strokeWidth="3" strokeLinecap="round" />

      {/* Branches */}
      <line x1="390" y1="240" x2="330" y2="218" stroke={C.earthMd} strokeWidth="5" strokeLinecap="round" />
      <line x1="410" y1="228" x2="470" y2="210" stroke={C.earthMd} strokeWidth="5" strokeLinecap="round" />
      <line x1="393" y1="210" x2="345" y2="185" stroke={C.earthMd} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="407" y1="205" x2="455" y2="178" stroke={C.earthMd} strokeWidth="3.5" strokeLinecap="round" />

      {/* Wide canopy */}
      <g
        className={animated ? 'garden-leaf motion-safe:animate-garden-leaf-sway' : ''}
        style={{ transformOrigin: '400px 175px' }}
      >
        <ellipse cx="400" cy="175" rx="110" ry="75" fill={C.leafDk} />
        <ellipse cx="375" cy="170" rx="78" ry="56" fill={C.leafMd} />
        <ellipse cx="425" cy="168" rx="80" ry="58" fill={C.leafBrt} opacity={0.6} />
        <ellipse cx="400" cy="165" rx="65" ry="46" fill={C.leafMd} opacity={0.5} />
        <ellipse cx="355" cy="182" rx="45" ry="33" fill={C.leafDk} opacity={0.5} />
        <ellipse cx="445" cy="178" rx="47" ry="35" fill={C.leafDk} opacity={0.5} />
      </g>

      {/* Lighthouse glow from within canopy */}
      <defs>
        <radialGradient id={`glow-${uid}`} cx="50%" cy="50%">
          <stop offset="0%" stopColor="rgba(255,215,0,0.3)" />
          <stop offset="50%" stopColor="rgba(255,215,0,0.15)" />
          <stop offset="100%" stopColor="rgba(255,215,0,0)" />
        </radialGradient>
      </defs>
      <g className={animated ? 'garden-glow motion-safe:animate-garden-glow-pulse' : ''}>
        <ellipse cx="400" cy="175" rx="70" ry="50" fill={`url(#glow-${uid})`} />
      </g>

      {/* Fruit */}
      <circle cx="350" cy="200" r="5" fill={C.amber} />
      <circle cx="450" cy="195" r="5" fill={C.teal} />
      <circle cx="375" cy="210" r="4" fill={C.amber} />
      <circle cx="425" cy="205" r="4" fill={C.teal} />
      <circle cx="360" cy="215" r="3.5" fill={C.green} />
      <circle cx="440" cy="212" r="3.5" fill={C.green} />

      {/* Bench under tree */}
      <rect x="420" y="278" width="40" height="4" rx="1" fill={C.earthMd} />
      <rect x="423" y="282" width="3" height="10" rx="0.5" fill={C.earthMd} />
      <rect x="454" y="282" width="3" height="10" rx="0.5" fill={C.earthMd} />

      {/* Wildflowers */}
      <Flower cx={260} cy={296} r={5} color={C.purple} />
      <Flower cx={280} cy={294} r={4} color={C.amber} />
      <Flower cx={300} cy={297} r={3.5} color={C.teal} />
      <Flower cx={320} cy={293} r={4} color={C.green} />
      <Flower cx={490} cy={295} r={5} color={C.purple} />
      <Flower cx={510} cy={293} r={4} color={C.amber} />
      <Flower cx={530} cy={296} r={3.5} color={C.teal} />
      <Flower cx={550} cy={294} r={4} color={C.green} />
      <Flower cx={340} cy={290} r={3} color={C.purple} />
      <Flower cx={460} cy={291} r={3} color={C.amber} />

      {/* Birds */}
      <BirdShape x={320} y={148} />
      <BirdShape x={480} y={140} />
      <BirdShape x={560} y={160} />
      <BirdShape x={250} y={175} />

      {/* Butterflies */}
      <ButterflyShape x={260} y={215} color={C.amber} animated={animated} />
      <ButterflyShape x={540} y={195} color={C.teal} animated={animated} delay="1.5s" />
      <ButterflyShape x={340} y={165} color={C.green} animated={animated} delay="3s" />
      <ButterflyShape x={470} y={225} color={C.purple} animated={animated} delay="4.5s" />

      {/* Grass */}
      <GrassBlades
        positions={[
          { x: 240, h: 14 },
          { x: 260, h: 17 },
          { x: 280, h: 13 },
          { x: 320, h: 15 },
          { x: 340, h: 12 },
          { x: 460, h: 15 },
          { x: 490, h: 14 },
          { x: 520, h: 17 },
          { x: 540, h: 12 },
          { x: 560, h: 14 },
        ]}
      />
    </g>
  )
}

// --- Stage Switcher ---

function GardenScene({
  stage,
  shouldAnimate,
  uid,
  streakActive,
}: {
  stage: number
  shouldAnimate: boolean
  uid: string
  streakActive: boolean
}) {
  switch (stage) {
    case 1:
      return <SeedlingScene />
    case 2:
      return <SproutScene />
    case 3:
      return <BloomingScene animated={shouldAnimate} />
    case 4:
      return <FlourishingScene animated={shouldAnimate} streakActive={streakActive} />
    case 5:
      return <OakScene uid={uid} animated={shouldAnimate} streakActive={streakActive} />
    case 6:
      return <LighthouseScene uid={uid} animated={shouldAnimate} streakActive={streakActive} />
    default:
      return <SeedlingScene />
  }
}

// --- Sparkle Particles ---

interface Particle {
  id: string
  x: number
  driftX: number
}

function SparkleOverlay({
  show,
  amplified,
  prefersReduced,
}: {
  show: boolean
  amplified: boolean
  prefersReduced: boolean
}) {
  const [particles, setParticles] = useState<Particle[]>([])
  const prevShowRef = useRef(false)

  useEffect(() => {
    // Only trigger on false→true transition (not on initial mount if show=false)
    if (show && !prevShowRef.current && !prefersReduced) {
      const count = amplified ? 8 + Math.floor(Math.random() * 3) : 3 + Math.floor(Math.random() * 2)
      const newParticles: Particle[] = Array.from({ length: count }, (_, i) => ({
        id: `${Date.now()}-${i}`,
        x: 10 + Math.random() * 80,
        driftX: -10 + Math.random() * 20,
      }))
      setParticles(newParticles)
    }
    prevShowRef.current = show
  }, [show, amplified, prefersReduced])

  const handleAnimationEnd = (id: string) => {
    setParticles((prev) => prev.filter((p) => p.id !== id))
  }

  if (particles.length === 0) return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" data-testid="garden-sparkle">
      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute h-1 w-1 rounded-full ${amplified ? 'bg-[rgba(109,40,217,0.7)]' : 'bg-[rgba(109,40,217,0.5)]'} animate-garden-sparkle-rise`}
          style={{
            left: `${p.x}%`,
            bottom: '30%',
            '--drift-x': `${p.driftX}px`,
          } as React.CSSProperties}
          onAnimationEnd={() => handleAnimationEnd(p.id)}
          data-testid="garden-sparkle-particle"
        />
      ))}
    </div>
  )
}

// --- Main Component ---

export function GrowthGarden({
  stage,
  animated = true,
  showSparkle = false,
  streakActive = true,
  size,
  amplifiedSparkle = false,
}: GrowthGardenProps) {
  const rawId = useId()
  const uid = rawId.replace(/:/g, '')
  const prefersReduced = useReducedMotion()
  const shouldAnimate = animated && !prefersReduced

  // Stage transition crossfade
  const [displayStage, setDisplayStage] = useState(stage)
  const [previousStage, setPreviousStage] = useState<number | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const isInitialMount = useRef(true)

  useEffect(() => {
    // Skip crossfade on initial render
    if (isInitialMount.current) {
      isInitialMount.current = false
      setDisplayStage(stage)
      return
    }

    if (stage !== displayStage) {
      if (animated && !prefersReduced) {
        setPreviousStage(displayStage)
        setDisplayStage(stage)
        setIsTransitioning(true)
        const timer = setTimeout(() => {
          setIsTransitioning(false)
          setPreviousStage(null)
        }, 2000)
        return () => clearTimeout(timer)
      } else {
        setDisplayStage(stage)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])

  return (
    <div className={`relative w-full ${SIZE_CLASSES[size]}`}>
      {/* Previous stage (fading out) */}
      {isTransitioning && previousStage !== null && (
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 800 400"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          className="absolute inset-0 animate-garden-fade-out"
          data-testid="garden-transition-old"
        >
          <SkyBackground uid={`${uid}-old`} streakActive={streakActive} />
          <SkyElements streakActive={streakActive} />
          <GroundLayer uid={`${uid}-old`} stage={previousStage} />
          <GardenScene stage={previousStage} shouldAnimate={shouldAnimate} uid={`${uid}-old`} streakActive={streakActive} />
        </svg>
      )}
      {/* Current stage (fading in during transition, or fully visible) */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 800 400"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={STAGE_LABELS[displayStage]}
        className={isTransitioning ? 'animate-garden-fade-in' : undefined}
        data-testid={isTransitioning ? 'garden-transition-new' : undefined}
      >
        <SkyBackground uid={uid} streakActive={streakActive} />
        <SkyElements streakActive={streakActive} />
        <GroundLayer uid={uid} stage={displayStage} />
        <GardenScene stage={displayStage} shouldAnimate={shouldAnimate} uid={uid} streakActive={streakActive} />
      </svg>
      <SparkleOverlay show={showSparkle} amplified={amplifiedSparkle} prefersReduced={prefersReduced} />
    </div>
  )
}
