import { Check, SkipForward, Mountain, BookOpen, Moon, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAudioState, useAudioDispatch } from './AudioProvider'
import type { RoutineStep } from '@/types/audio'

const STEP_ICONS: Record<RoutineStep['type'], typeof Mountain> = {
  scene: Mountain,
  scripture: BookOpen,
  story: Moon,
  'bible-navigate': BookOpen,
}

export function RoutineStepper() {
  const state = useAudioState()
  const dispatch = useAudioDispatch()

  if (!state.activeRoutine) return null

  const { steps, currentStepIndex } = state.activeRoutine

  return (
    <div className="border-t border-white/10 px-4 py-3">
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={currentStepIndex + 1}
        aria-label={`Routine progress — step ${currentStepIndex + 1} of ${steps.length}`}
        className="flex items-center gap-2"
      >
        {steps.map((step, i) => {
          const Icon = STEP_ICONS[step.type] ?? Mountain
          const isCompleted = i < currentStepIndex
          const isCurrent = i === currentStepIndex

          return (
            <div key={step.stepId} className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex shrink-0 items-center justify-center rounded-full transition-transform',
                  isCompleted && 'h-6 w-6 bg-primary/30 text-primary sm:h-7 sm:w-7',
                  isCurrent && 'h-7 w-7 scale-110 bg-primary text-white sm:h-8 sm:w-8',
                  !isCompleted && !isCurrent && 'h-6 w-6 bg-white/10 text-white/60 sm:h-7 sm:w-7',
                )}
                aria-label={`Step ${i + 1}: ${step.label}${isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ''}`}
              >
                {isCompleted ? <Check size={14} /> : <Icon size={14} />}
              </div>
              <span className="hidden max-w-[60px] truncate text-[10px] text-white/60 sm:block">
                {step.label}
              </span>
            </div>
          )
        })}

        {/* Timer icon at end */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/60 sm:h-7 sm:w-7">
            <Clock size={14} />
          </div>
          <span className="hidden text-[10px] text-white/60 sm:block">Timer</span>
        </div>

        {/* Skip button */}
        <button
          type="button"
          onClick={() => dispatch({ type: 'SKIP_ROUTINE_STEP' })}
          aria-label="Skip to next routine step"
          className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt"
        >
          <SkipForward size={14} />
        </button>
      </div>
    </div>
  )
}
