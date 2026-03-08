import { Check, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAudioState, useAudioDispatch } from './AudioProvider'

export function RoutineStepper() {
  const state = useAudioState()
  const dispatch = useAudioDispatch()

  if (!state.activeRoutine) return null

  const { steps, currentStepIndex } = state.activeRoutine

  return (
    <div className="flex items-center gap-2 border-t border-white/10 px-4 py-3">
      {steps.map((step, i) => (
        <div
          key={step.stepId}
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium',
            i < currentStepIndex && 'bg-primary/30 text-primary',
            i === currentStepIndex && 'bg-primary text-white',
            i > currentStepIndex && 'bg-white/10 text-white/40',
          )}
          aria-label={`Step ${i + 1}: ${step.label}${i < currentStepIndex ? ' (completed)' : i === currentStepIndex ? ' (current)' : ''}`}
        >
          {i < currentStepIndex ? <Check size={14} /> : i + 1}
        </div>
      ))}

      <button
        type="button"
        onClick={() => dispatch({ type: 'SKIP_ROUTINE_STEP' })}
        aria-label="Skip to next step"
        className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt"
      >
        <SkipForward size={14} />
      </button>
    </div>
  )
}
