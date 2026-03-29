import { Mountain, BookOpen, Moon, ArrowUp, ArrowDown, X } from 'lucide-react'

const ICON_MAP = {
  scene: Mountain,
  scripture: BookOpen,
  story: Moon,
} as const

const BORDER_COLOR_MAP = {
  scene: 'border-glow-cyan',
  scripture: 'border-amber-400',
  story: 'border-primary-lt',
} as const

interface RoutineStepCardProps {
  stepNumber: number
  type: 'scene' | 'scripture' | 'story'
  contentName: string
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}

export function RoutineStepCard({
  stepNumber,
  type,
  contentName,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
}: RoutineStepCardProps) {
  const Icon = ICON_MAP[type]
  const borderColor = BORDER_COLOR_MAP[type]

  return (
    <div
      role="listitem"
      aria-roledescription="reorderable step"
      aria-label={`Step ${stepNumber}: ${contentName} ${type}`}
      className={`flex items-center gap-3 rounded-lg border-l-2 bg-white/5 p-4 ${borderColor}`}
    >
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          aria-label={`Move step ${stepNumber} up`}
          className="flex h-11 w-11 items-center justify-center rounded text-white/60 transition-colors hover:text-white disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
        >
          <ArrowUp size={14} />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          aria-label={`Move step ${stepNumber} down`}
          className="flex h-11 w-11 items-center justify-center rounded text-white/60 transition-colors hover:text-white disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
        >
          <ArrowDown size={14} />
        </button>
      </div>

      <span className="text-xs font-medium text-white/60">{stepNumber}</span>

      <Icon size={18} className="shrink-0 text-white/70" />

      <span className="min-w-0 flex-1 truncate text-sm text-white">{contentName}</span>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove step ${stepNumber}`}
        className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
      >
        <X size={16} />
      </button>
    </div>
  )
}
