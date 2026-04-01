import { useState } from 'react'
import { Plus, Mountain, BookOpen, Moon, Clock, AlertCircle } from 'lucide-react'
import { RoutineStepCard } from './RoutineStepCard'
import { ContentPicker } from './ContentPicker'
import { AUDIO_CONFIG } from '@/constants/audio'
import { SCENE_BY_ID } from '@/data/scenes'
import { SCRIPTURE_READING_BY_ID } from '@/data/music/scripture-readings'
import { BEDTIME_STORY_BY_ID } from '@/data/music/bedtime-stories'
import { CharacterCount } from '@/components/ui/CharacterCount'
import type { RoutineDefinition } from '@/types/storage'

type StepType = 'scene' | 'scripture' | 'story'

interface BuilderStep {
  id: string
  type: StepType
  contentId: string
  contentName: string
  transitionGapMinutes: number
}

interface RoutineBuilderProps {
  initial?: RoutineDefinition | null
  onSave: (routine: Omit<RoutineDefinition, 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
}

function resolveContentName(type: StepType, contentId: string): string {
  if (type === 'scene') return SCENE_BY_ID.get(contentId)?.name ?? contentId
  if (type === 'scripture') return SCRIPTURE_READING_BY_ID.get(contentId)?.title ?? contentId
  return BEDTIME_STORY_BY_ID.get(contentId)?.title ?? contentId
}

export function RoutineBuilder({ initial, onSave, onCancel }: RoutineBuilderProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [steps, setSteps] = useState<BuilderStep[]>(
    initial?.steps
      .filter((s) => s.type !== 'bible-navigate')
      .map((s) => ({
        id: s.id,
        type: s.type as StepType,
        contentId: s.contentId,
        contentName: resolveContentName(s.type as StepType, s.contentId),
        transitionGapMinutes: s.transitionGapMinutes,
      })) ?? [],
  )
  const [sleepDuration, setSleepDuration] = useState(
    initial?.sleepTimer.durationMinutes ?? 45,
  )
  const [fadeDuration, setFadeDuration] = useState(
    initial?.sleepTimer.fadeDurationMinutes ?? 15,
  )

  const [showNameError, setShowNameError] = useState(false)
  const [showTypePicker, setShowTypePicker] = useState(false)
  const [contentPickerType, setContentPickerType] = useState<StepType | null>(null)

  const handleAddStepType = (type: StepType) => {
    setShowTypePicker(false)
    setContentPickerType(type)
  }

  const handleContentSelect = (type: StepType, contentId: string, contentName: string) => {
    setSteps((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type,
        contentId,
        contentName,
        transitionGapMinutes: prev.length === 0 ? 0 : 2,
      },
    ])
    setContentPickerType(null)
  }

  const handleRemoveStep = (id: string) => {
    setSteps((prev) => {
      const filtered = prev.filter((s) => s.id !== id)
      // Ensure first step always has 0 gap
      if (filtered.length > 0 && filtered[0].transitionGapMinutes !== 0) {
        filtered[0] = { ...filtered[0], transitionGapMinutes: 0 }
      }
      return filtered
    })
  }

  const handleMoveStep = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= steps.length) return
    setSteps((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      // Ensure first step always has 0 gap
      if (next.length > 0) {
        next[0] = { ...next[0], transitionGapMinutes: 0 }
      }
      return next
    })
  }

  const handleGapChange = (index: number, minutes: number) => {
    if (index === 0) return // first step can't have a gap
    setSteps((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, transitionGapMinutes: Math.max(0, minutes) } : s,
      ),
    )
  }

  const handleSave = () => {
    if (steps.length === 0) return
    if (!name.trim()) {
      setShowNameError(true)
      return
    }

    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim() || `My Routine (${steps.length} steps)`,
      isTemplate: false,
      steps: steps.map((s) => ({
        id: s.id,
        type: s.type,
        contentId: s.contentId,
        transitionGapMinutes: s.transitionGapMinutes,
      })),
      sleepTimer: {
        durationMinutes: sleepDuration,
        fadeDurationMinutes: fadeDuration,
      },
    })
  }

  return (
    <>
      <div
        className="rounded-2xl border border-white/10 p-6"
        style={{
          background: 'rgba(15, 10, 30, 0.95)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Name input */}
        <label htmlFor="routine-name" className="mb-1 block text-xs font-medium text-white/60">
          Routine Name
        </label>
        <input
          id="routine-name"
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value.slice(0, 50)); setShowNameError(false) }}
          maxLength={50}
          placeholder="My Bedtime Routine"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/50 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          aria-invalid={showNameError ? 'true' : undefined}
          aria-describedby={showNameError ? 'routine-name-error routine-name-count' : 'routine-name-count'}
        />
        {showNameError && (
          <p id="routine-name-error" role="alert" className="mt-1 flex items-center gap-1.5 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            Routine name is required
          </p>
        )}
        <div className="mt-1 mb-6">
          <CharacterCount current={name.length} max={50} visibleAt={35} id="routine-name-count" />
        </div>

        {/* Step timeline */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-medium text-white/80">Steps</h3>

          {steps.length === 0 ? (
            <p className="mb-4 text-center text-sm text-white/60">
              Add steps to build your routine
            </p>
          ) : (
            <div role="list" className="relative space-y-3">
              {/* Connecting line */}
              {steps.length > 1 && (
                <div className="absolute bottom-4 left-[22px] top-4 w-px bg-white/10" />
              )}

              {steps.map((step, i) => (
                <div key={step.id} className="relative">
                  {/* Transition gap control (not for first step) */}
                  {i > 0 && (
                    <div className="mb-2 flex items-center gap-2 pl-8">
                      <Clock size={12} className="text-white/30" />
                      <span className="text-xs text-white/60">Wait</span>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={step.transitionGapMinutes}
                        onChange={(e) =>
                          handleGapChange(i, Number(e.target.value) || 0)
                        }
                        aria-label={`Transition gap before step ${i + 1} in minutes`}
                        className="w-12 rounded border border-white/10 bg-white/5 px-2 py-0.5 text-center text-xs text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-xs text-white/60">min</span>
                    </div>
                  )}

                  <RoutineStepCard
                    stepNumber={i + 1}
                    type={step.type}
                    contentName={step.contentName}
                    isFirst={i === 0}
                    isLast={i === steps.length - 1}
                    onMoveUp={() => handleMoveStep(i, i - 1)}
                    onMoveDown={() => handleMoveStep(i, i + 1)}
                    onRemove={() => handleRemoveStep(step.id)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Add step */}
          {showTypePicker ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleAddStepType('scene')}
                className="flex items-center gap-1.5 rounded-lg border border-glow-cyan/30 bg-glow-cyan/10 px-3 py-2 text-xs font-medium text-glow-cyan transition-colors hover:bg-glow-cyan/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-cyan"
              >
                <Mountain size={14} /> Scene
              </button>
              <button
                type="button"
                onClick={() => handleAddStepType('scripture')}
                className="flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <BookOpen size={14} /> Scripture
              </button>
              <button
                type="button"
                onClick={() => handleAddStepType('story')}
                className="flex items-center gap-1.5 rounded-lg border border-primary-lt/30 bg-primary-lt/10 px-3 py-2 text-xs font-medium text-primary-lt transition-colors hover:bg-primary-lt/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt"
              >
                <Moon size={14} /> Story
              </button>
              <button
                type="button"
                onClick={() => setShowTypePicker(false)}
                className="px-2 py-2 text-xs text-white/50 hover:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:rounded"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowTypePicker(true)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 py-3 text-sm text-white/50 transition-colors hover:border-white/40 hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Plus size={16} /> Add Step
            </button>
          )}
        </div>

        {/* Sleep timer config */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="routine-sleep-timer" className="mb-1 block text-xs font-medium text-white/60">
              Sleep Timer
            </label>
            <select
              id="routine-sleep-timer"
              value={sleepDuration}
              onChange={(e) => setSleepDuration(Number(e.target.value))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {AUDIO_CONFIG.SLEEP_TIMER_OPTIONS.map((opt) => (
                <option key={opt} value={opt} className="bg-hero-dark">
                  {opt} min
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="routine-fade-duration" className="mb-1 block text-xs font-medium text-white/60">
              Fade Duration
            </label>
            <select
              id="routine-fade-duration"
              value={fadeDuration}
              onChange={(e) => setFadeDuration(Number(e.target.value))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {AUDIO_CONFIG.FADE_DURATION_OPTIONS.map((opt) => (
                <option key={opt} value={opt} className="bg-hero-dark">
                  {opt} min
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-white/20 px-6 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={steps.length === 0}
            className="rounded-lg bg-primary px-8 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt"
          >
            Save Routine
          </button>
        </div>
      </div>

      {contentPickerType && (
        <ContentPicker
          type={contentPickerType}
          onSelect={handleContentSelect}
          onClose={() => setContentPickerType(null)}
        />
      )}
    </>
  )
}
