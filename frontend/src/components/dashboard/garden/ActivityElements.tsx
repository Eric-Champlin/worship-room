import type { GardenActivityElements } from '@/hooks/useGardenElements'

interface ActivityElementsProps {
  elements: GardenActivityElements
  stage: 1 | 2 | 3 | 4 | 5 | 6
  prefersReduced: boolean
}

// Element rendering order (used for max-3 at stages 1-2)
const ELEMENT_ORDER: (keyof GardenActivityElements)[] = [
  'writingDesk',
  'cushion',
  'candle',
  'bible',
  'windChime',
]

export function ActivityElements({ elements, stage, prefersReduced }: ActivityElementsProps) {
  const maxElements = stage <= 2 ? 3 : 5
  // Wind chime only at stages 3+
  const unlockedKeys = ELEMENT_ORDER.filter((key) => {
    if (!elements[key]) return false
    if (key === 'windChime' && stage < 3) return false
    return true
  }).slice(0, maxElements)

  if (unlockedKeys.length === 0) return null

  return (
    <g data-testid="garden-activity-elements">
      {unlockedKeys.map((key, i) => (
        <g
          key={key}
          className={prefersReduced ? undefined : 'motion-safe:animate-garden-element-fade'}
          style={prefersReduced ? undefined : { animationDelay: `${i * 100}ms` }}
          data-testid={`garden-activity-${key}`}
        >
          {key === 'writingDesk' && <WritingDesk />}
          {key === 'cushion' && <MeditationCushion />}
          {key === 'candle' && <PrayerCandle prefersReduced={prefersReduced} />}
          {key === 'bible' && <OpenBible />}
          {key === 'windChime' && <WindChime />}
        </g>
      ))}
    </g>
  )
}

function WritingDesk() {
  return (
    <g>
      {/* Desk top */}
      <rect x="85" y="330" width="30" height="6" rx="1" fill="#5C4033" />
      {/* Legs */}
      <rect x="88" y="336" width="3" height="10" fill="#5C4033" />
      <rect x="109" y="336" width="3" height="10" fill="#5C4033" />
      {/* Open book pages */}
      <path d="M93,329 L100,325 L100,330 L93,330 Z" fill="#FBBF24" opacity={0.7} />
      <path d="M100,325 L107,329 L107,330 L100,330 Z" fill="#FDE68A" opacity={0.7} />
    </g>
  )
}

function MeditationCushion() {
  return (
    <g>
      <ellipse cx="250" cy="355" rx="15" ry="8" fill="#6D28D9" />
      <ellipse cx="250" cy="353" rx="12" ry="5" fill="#A78BFA" />
    </g>
  )
}

function PrayerCandle({ prefersReduced }: { prefersReduced: boolean }) {
  return (
    <g>
      {/* Candle body */}
      <rect x="398" y="325" width="4" height="15" rx="1" fill="#FBBF24" />
      {/* Flame */}
      <ellipse
        cx="400"
        cy="322"
        rx="4"
        ry="6"
        fill="#D97706"
        opacity={prefersReduced ? 0.8 : undefined}
        className={prefersReduced ? undefined : 'motion-safe:animate-garden-flame-flicker'}
      />
    </g>
  )
}

function OpenBible() {
  return (
    <g>
      {/* Cover */}
      <rect x="540" y="340" width="20" height="15" rx="1" fill="#5C4033" />
      {/* Pages */}
      <rect x="542" y="342" width="8" height="11" fill="#FDE68A" />
      <rect x="551" y="342" width="8" height="11" fill="#FDE68A" />
      {/* Spine line */}
      <line x1="550" y1="341" x2="550" y2="354" stroke="#5C4033" strokeWidth="0.5" />
    </g>
  )
}

function WindChime() {
  return (
    <g>
      {/* String from branch */}
      <line x1="650" y1="190" x2="650" y2="210" stroke="#9CA3AF" strokeWidth="0.5" />
      {/* Horizontal bar */}
      <rect x="641" y="210" width="18" height="2" rx="1" fill="#9CA3AF" />
      {/* Chime rods */}
      <rect x="643" y="212" width="2" height="10" rx="0.5" fill="#9CA3AF" />
      <rect x="649" y="212" width="2" height="12" rx="0.5" fill="#9CA3AF" />
      <rect x="655" y="212" width="2" height="9" rx="0.5" fill="#9CA3AF" />
    </g>
  )
}
