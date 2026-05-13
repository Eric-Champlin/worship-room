import { useCallback, useEffect, useReducer, useRef } from 'react'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { useCompletionTracking } from '@/hooks/useCompletionTracking'
import {
  getPromptsForLength,
  PROMPT_VISIBLE_MS,
  PROMPT_FADE_IN_MS,
  PROMPT_FADE_OUT_MS,
  type PrayPrompt,
} from '@/constants/pray-session-prompts'

export type PrayLength = 1 | 5 | 10

export type PraySessionPhase =
  | 'idle'
  | 'fading-in'
  | 'visible'
  | 'fading-out'
  | 'silence'
  | 'amen'
  | 'complete'

interface PraySessionState {
  phase: PraySessionPhase
  promptIndex: number
  shuffled: ReadonlyArray<PrayPrompt>
  promptsSeen: number
}

type PraySessionAction =
  | { type: 'START'; shuffled: ReadonlyArray<PrayPrompt> }
  | { type: 'ADVANCE_TO_VISIBLE' }
  | { type: 'ADVANCE_TO_FADE_OUT' }
  | { type: 'ADVANCE_TO_SILENCE' }
  | { type: 'ADVANCE_TO_NEXT_PROMPT' }
  | { type: 'ADVANCE_TO_AMEN' }
  | { type: 'COMPLETE' }

// First and last fixed positions preserved; middle range Fisher-Yates shuffled.
function shufflePrompts(prompts: ReadonlyArray<PrayPrompt>): ReadonlyArray<PrayPrompt> {
  const arr = [...prompts]
  const startIdx = arr[0]?.fixedPosition === 'first' ? 1 : 0
  const endIdx = arr[arr.length - 1]?.fixedPosition === 'last' ? arr.length - 1 : arr.length
  for (let i = endIdx - 1; i > startIdx; i--) {
    const j = startIdx + Math.floor(Math.random() * (i - startIdx + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function reducer(state: PraySessionState, action: PraySessionAction): PraySessionState {
  switch (action.type) {
    case 'START':
      return {
        phase: 'fading-in',
        promptIndex: 0,
        shuffled: action.shuffled,
        promptsSeen: 0,
      }
    case 'ADVANCE_TO_VISIBLE':
      return { ...state, phase: 'visible', promptsSeen: state.promptsSeen + 1 }
    case 'ADVANCE_TO_FADE_OUT':
      return { ...state, phase: 'fading-out' }
    case 'ADVANCE_TO_SILENCE':
      return { ...state, phase: 'silence' }
    case 'ADVANCE_TO_NEXT_PROMPT':
      return { ...state, phase: 'fading-in', promptIndex: state.promptIndex + 1 }
    case 'ADVANCE_TO_AMEN':
      return { ...state, phase: 'amen' }
    case 'COMPLETE':
      return { ...state, phase: 'complete' }
    default:
      return state
  }
}

interface UsePraySessionParams {
  length: PrayLength
}

interface UsePraySessionReturn {
  phase: PraySessionPhase
  currentPrompt: PrayPrompt | null
  promptIndex: number
  totalPrompts: number
  promptsSeen: number
  endEarly: () => void
}

export function usePraySession({ length }: UsePraySessionParams): UsePraySessionReturn {
  const { recordActivity } = useFaithPoints()
  const { markPrayComplete } = useCompletionTracking()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const completedRef = useRef(false)
  const promptsSeenRef = useRef(0)

  const [state, dispatch] = useReducer(reducer, {
    phase: 'idle',
    promptIndex: 0,
    shuffled: [],
    promptsSeen: 0,
  })

  // Keep ref in sync with state for early-exit / unmount paths.
  useEffect(() => {
    promptsSeenRef.current = state.promptsSeen
  }, [state.promptsSeen])

  // Record session — idempotent via completedRef (prevents double-fire on natural
  // completion racing with unmount, or endEarly racing with the silence timer).
  const recordSessionActivity = useCallback(
    (endedEarly: boolean, promptsSeenAtExit: number) => {
      if (completedRef.current) return
      completedRef.current = true
      markPrayComplete()
      recordActivity('pray', 'daily_hub_session', {
        metadata: {
          length,
          ended_early: endedEarly,
          prompts_seen: promptsSeenAtExit,
          audio_used: false,
        },
      })
    },
    [length, markPrayComplete, recordActivity],
  )

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Start session on mount.
  useEffect(() => {
    const shuffled = shufflePrompts(getPromptsForLength(length))
    dispatch({ type: 'START', shuffled })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Drive the timer chain on phase + promptIndex changes.
  useEffect(() => {
    clearTimer()
    if (state.phase === 'idle' || state.phase === 'complete') return

    const currentPrompt = state.shuffled[state.promptIndex]
    const isLastPrompt = state.promptIndex === state.shuffled.length - 1

    if (state.phase === 'fading-in') {
      timerRef.current = setTimeout(
        () => dispatch({ type: 'ADVANCE_TO_VISIBLE' }),
        PROMPT_FADE_IN_MS,
      )
    } else if (state.phase === 'visible') {
      timerRef.current = setTimeout(
        () => dispatch({ type: 'ADVANCE_TO_FADE_OUT' }),
        PROMPT_VISIBLE_MS,
      )
    } else if (state.phase === 'fading-out') {
      timerRef.current = setTimeout(
        () => dispatch({ type: 'ADVANCE_TO_SILENCE' }),
        PROMPT_FADE_OUT_MS,
      )
    } else if (state.phase === 'silence') {
      timerRef.current = setTimeout(
        () => {
          if (isLastPrompt) {
            recordSessionActivity(false, promptsSeenRef.current)
            dispatch({ type: 'ADVANCE_TO_AMEN' })
          } else {
            dispatch({ type: 'ADVANCE_TO_NEXT_PROMPT' })
          }
        },
        currentPrompt?.silenceMs ?? 30_000,
      )
    }
    // phase === 'amen' has no timer here — PrayCompletionScreen owns the hold.

    return clearTimer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.promptIndex])

  // Unmount cleanup: if the user navigates away mid-session without explicit
  // End-early, treat as early exit so the activity still records.
  useEffect(() => {
    return () => {
      clearTimer()
      if (!completedRef.current) {
        recordSessionActivity(true, promptsSeenRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const endEarly = useCallback(() => {
    clearTimer()
    recordSessionActivity(true, promptsSeenRef.current)
    dispatch({ type: 'ADVANCE_TO_AMEN' })
  }, [clearTimer, recordSessionActivity])

  const currentPrompt = state.shuffled[state.promptIndex] ?? null

  return {
    phase: state.phase,
    currentPrompt,
    promptIndex: state.promptIndex,
    totalPrompts: state.shuffled.length,
    promptsSeen: state.promptsSeen,
    endEarly,
  }
}
