import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import {
  useAudioState,
  useAudioDispatch,
  useAudioEngine,
} from '@/components/audio/AudioProvider'
import { useToast } from '@/components/ui/Toast'
import { AUDIO_BASE_URL, AUDIO_CONFIG } from '@/constants/audio'
import { SOUND_BY_ID } from '@/data/sound-catalog'
import { SCENE_BY_ID } from '@/data/scenes'
import { SCRIPTURE_READING_BY_ID, SCRIPTURE_COLLECTIONS } from '@/data/music/scripture-readings'
import { BEDTIME_STORY_BY_ID } from '@/data/music/bedtime-stories'
import { storageService } from '@/services/storage-service'
import type { RoutineDefinition } from '@/types/storage'
import type { AudioRoutine, RoutineStep } from '@/types/audio'
import type { ScriptureReading, BedtimeStory } from '@/types/music'

const SCENE_STAGGER_MS = 200
const CROSSFADE_OUT_MS = 2000
const AMBIENT_BREATHE_MS = 5000

export interface UseRoutinePlayerReturn {
  startRoutine: (routine: RoutineDefinition) => void
  skipStep: () => void
  endRoutine: () => void
  pendingInterrupt: { action: () => void; label: string } | null
  confirmInterrupt: () => void
  cancelInterrupt: () => void
  isRoutineActive: boolean
}

function isScriptureReading(
  content: ScriptureReading | BedtimeStory,
): content is ScriptureReading {
  return 'scriptureReference' in content
}

/** Resolve a contentId that might be a collection ID to a specific reading */
function resolveScriptureId(contentId: string): ScriptureReading | null {
  // Check if it's a direct reading ID
  const direct = SCRIPTURE_READING_BY_ID.get(contentId)
  if (direct) return direct

  // Check if it's a collection ID — pick a random reading
  const collection = SCRIPTURE_COLLECTIONS.find((c) => c.id === contentId)
  if (collection && collection.readings.length > 0) {
    const idx = Math.floor(Math.random() * collection.readings.length)
    return collection.readings[idx]
  }

  return null
}

export function useRoutinePlayer(): UseRoutinePlayerReturn {
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const audioState = useAudioState()
  const dispatch = useAudioDispatch()
  const engine = useAudioEngine()
  const { showToast } = useToast()

  const [pendingInterrupt, setPendingInterrupt] = useState<{
    action: () => void
    label: string
  } | null>(null)

  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const routineStartTimeRef = useRef<string | null>(null)

  // Use ref for activeSounds to avoid stale closures in async retry loops
  const activeSoundsRef = useRef(audioState.activeSounds)
  useEffect(() => {
    activeSoundsRef.current = audioState.activeSounds
  }, [audioState.activeSounds])

  const isRoutineActive = audioState.activeRoutine !== null

  // Clean up gap timer on unmount
  useEffect(() => {
    return () => {
      if (gapTimerRef.current) {
        clearTimeout(gapTimerRef.current)
      }
    }
  }, [])

  // ── Load a scene step ───────────────────────────────────────────────
  const loadSceneStep = useCallback(
    async (contentId: string): Promise<boolean> => {
      const scene = SCENE_BY_ID.get(contentId)
      if (!scene || !engine) return false

      // Remove existing sounds (read current value from ref, not closed-over state)
      for (const sound of activeSoundsRef.current) {
        dispatch({ type: 'REMOVE_SOUND', payload: { soundId: sound.soundId } })
      }

      dispatch({
        type: 'SET_SCENE_NAME',
        payload: { sceneName: scene.name, sceneId: scene.id },
      })

      // Load sounds with staggered fade-in
      let loadedCount = 0
      for (let i = 0; i < scene.sounds.length; i++) {
        const sceneSound = scene.sounds[i]
        const catalogSound = SOUND_BY_ID.get(sceneSound.soundId)
        if (!catalogSound) continue

        const url = AUDIO_BASE_URL + catalogSound.filename

        await new Promise<void>((resolve) => {
          setTimeout(async () => {
            try {
              await engine.addSound(sceneSound.soundId, url, sceneSound.volume)
              dispatch({
                type: 'ADD_SOUND',
                payload: {
                  soundId: sceneSound.soundId,
                  volume: sceneSound.volume,
                  label: catalogSound.name,
                  url,
                },
              })
              loadedCount++
            } catch {
              // Non-fatal: individual sound load failure
            }
            resolve()
          }, i * SCENE_STAGGER_MS)
        })
      }

      return loadedCount > 0
    },
    [dispatch, engine],
  )

  // ── Load a foreground step (scripture/story) ────────────────────────
  const loadForegroundStep = useCallback(
    async (
      contentId: string,
      type: 'scripture' | 'story',
    ): Promise<boolean> => {
      if (!engine) return false

      let content: ScriptureReading | BedtimeStory | null = null

      if (type === 'scripture') {
        content = resolveScriptureId(contentId)
      } else {
        content = BEDTIME_STORY_BY_ID.get(contentId) ?? null
      }

      if (!content) return false

      const url = AUDIO_BASE_URL + content.audioFilename
      const isScripture = isScriptureReading(content)

      try {
        const audioElement = engine.playForeground(url)

        // Set up listeners (same pattern as useForegroundPlayer)
        const onTimeUpdate = () => {
          dispatch({
            type: 'UPDATE_FOREGROUND_POSITION',
            payload: { position: audioElement.currentTime },
          })
        }

        const onEnded = () => {
          audioElement.removeEventListener('timeupdate', onTimeUpdate)
          audioElement.removeEventListener('ended', onEnded)
          dispatch({ type: 'FOREGROUND_ENDED' })
        }

        audioElement.addEventListener('timeupdate', onTimeUpdate)
        audioElement.addEventListener('ended', onEnded)

        dispatch({
          type: 'START_FOREGROUND',
          payload: {
            contentId: content.id,
            contentType: isScripture ? 'scripture' : 'story',
            title: content.title,
            duration: content.durationSeconds,
            scriptureReference: isScripture ? (content as ScriptureReading).scriptureReference : undefined,
            voiceGender: content.voiceId,
            webText: isScripture ? (content as ScriptureReading).webText : undefined,
          },
        })

        return true
      } catch {
        return false
      }
    },
    [engine, dispatch],
  )

  // ── Execute a single step with retries ──────────────────────────────
  const executeStep = useCallback(
    async (step: RoutineStep): Promise<boolean> => {
      const retryDelays = AUDIO_CONFIG.LOAD_RETRY_DELAYS_MS

      for (let attempt = 0; attempt <= AUDIO_CONFIG.LOAD_RETRY_MAX; attempt++) {
        let success = false

        if (step.type === 'scene') {
          success = await loadSceneStep(step.contentId)
        } else {
          success = await loadForegroundStep(step.contentId, step.type)
        }

        if (success) return true

        // Wait before retry (except on last attempt)
        if (attempt < AUDIO_CONFIG.LOAD_RETRY_MAX) {
          const delay = retryDelays[Math.min(attempt, retryDelays.length - 1)]
          await new Promise((r) => setTimeout(r, delay))
        }
      }

      showToast(`Skipped ${step.label} — couldn't load audio`)
      return false
    },
    [loadSceneStep, loadForegroundStep, showToast],
  )

  // ── Advance to next step or finish routine ──────────────────────────
  const advanceToNextStep = useCallback(() => {
    if (!audioState.activeRoutine) return

    const nextIndex = audioState.activeRoutine.currentStepIndex + 1

    if (nextIndex >= audioState.activeRoutine.steps.length) {
      // Routine complete — move to ambient-only phase
      dispatch({ type: 'SET_ROUTINE_PHASE', payload: { phase: 'ambient-only' } })

      // Start sleep timer if not already active
      if (!audioState.sleepTimer?.isActive) {
        const { durationMinutes, fadeDurationMinutes } =
          audioState.activeRoutine.sleepTimerConfig
        dispatch({
          type: 'START_SLEEP_TIMER',
          payload: {
            totalDurationMs: durationMinutes * 60000,
            fadeDurationMs: fadeDurationMinutes * 60000,
          },
        })
      }

      // Log listening session
      if (routineStartTimeRef.current) {
        const startedAt = routineStartTimeRef.current
        const durationSeconds = Math.round(
          (Date.now() - new Date(startedAt).getTime()) / 1000,
        )
        storageService.logListeningSession({
          contentType: 'routine',
          contentId: audioState.activeRoutine.routineId,
          startedAt,
          durationSeconds,
          completed: true,
        })
      }

      return
    }

    // Advance and execute next step
    dispatch({ type: 'ADVANCE_ROUTINE_STEP' })
  }, [audioState.activeRoutine, audioState.sleepTimer?.isActive, dispatch])

  // ── Execute the current step whenever it changes ────────────────────
  const currentStepIndexRef = useRef<number | null>(null)
  const routineIdRef = useRef<string | null>(null)

  useEffect(() => {
    const routine = audioState.activeRoutine
    if (!routine || routine.phase !== 'playing') return

    // Only run when step index or routine ID changes
    const stepChanged =
      currentStepIndexRef.current !== routine.currentStepIndex ||
      routineIdRef.current !== routine.routineId
    if (!stepChanged) return

    currentStepIndexRef.current = routine.currentStepIndex
    routineIdRef.current = routine.routineId

    const step = routine.steps[routine.currentStepIndex]
    if (!step) return

    // Scene steps execute immediately; foreground steps also execute immediately
    // (the scene from a previous step is already playing)
    executeStep(step).then((success) => {
      if (!success && step.type === 'scene') {
        // Scene failed — advance past it but don't leave silence
        advanceToNextStep()
      }
      // For foreground steps that fail, executeStep already shows a toast and
      // the foregroundContent watcher will handle advancing
    })
  }, [
    audioState.activeRoutine,
    executeStep,
    advanceToNextStep,
  ])

  // ── Watch for foreground content ending naturally ───────────────────
  // Uses the dedicated FOREGROUND_ENDED action (dispatched only by the audio
  // element's 'ended' event) via the foregroundEndedCounter. This avoids
  // false-positive advances when the user manually pauses playback.
  const prevEndedCounterRef = useRef(audioState.foregroundEndedCounter)

  useEffect(() => {
    const prevCounter = prevEndedCounterRef.current
    prevEndedCounterRef.current = audioState.foregroundEndedCounter

    // Only react to actual increments
    if (audioState.foregroundEndedCounter <= prevCounter) return

    if (!audioState.activeRoutine) return
    if (audioState.activeRoutine.phase !== 'playing') return

    const currentStep =
      audioState.activeRoutine.steps[audioState.activeRoutine.currentStepIndex]
    if (!currentStep || currentStep.type === 'scene') return

    // Foreground content ended naturally — start transition gap
    const nextIndex = audioState.activeRoutine.currentStepIndex + 1
    const nextStep = audioState.activeRoutine.steps[nextIndex]
    const gapMinutes = nextStep?.transitionGapMinutes ?? 0

    if (gapMinutes > 0) {
      dispatch({
        type: 'SET_ROUTINE_PHASE',
        payload: { phase: 'transition-gap' },
      })

      // Breathe up ambient during gap
      engine?.breatheUpAmbient(AMBIENT_BREATHE_MS)

      gapTimerRef.current = setTimeout(() => {
        gapTimerRef.current = null
        advanceToNextStep()
      }, gapMinutes * 60000)
    } else {
      advanceToNextStep()
    }
  }, [
    audioState.foregroundEndedCounter,
    audioState.activeRoutine,
    dispatch,
    engine,
    advanceToNextStep,
  ])

  // ── Start a routine ─────────────────────────────────────────────────
  const startRoutine = useCallback(
    (routine: RoutineDefinition) => {
      if (!isAuthenticated) {
        authModal?.openAuthModal('Sign in to use bedtime routines')
        return
      }

      // Map RoutineDefinition to AudioRoutine
      const audioRoutine: AudioRoutine = {
        routineId: routine.id,
        routineName: routine.name,
        currentStepIndex: 0,
        phase: 'playing',
        sleepTimerConfig: routine.sleepTimer,
        steps: routine.steps.map((s) => ({
          stepId: s.id,
          type: s.type,
          contentId: s.contentId,
          label: resolveStepLabel(s.type, s.contentId),
          icon: stepTypeToIcon(s.type),
          transitionGapMinutes: s.transitionGapMinutes,
        })),
      }

      routineStartTimeRef.current = new Date().toISOString()
      currentStepIndexRef.current = null
      routineIdRef.current = null

      dispatch({ type: 'START_ROUTINE', payload: audioRoutine })
    },
    [isAuthenticated, authModal, dispatch],
  )

  // ── Skip current step ───────────────────────────────────────────────
  const skipStep = useCallback(() => {
    if (!audioState.activeRoutine) return

    // Clear any transition gap timer
    if (gapTimerRef.current) {
      clearTimeout(gapTimerRef.current)
      gapTimerRef.current = null
    }

    // If foreground is playing, crossfade out
    if (audioState.foregroundContent?.isPlaying && engine) {
      engine.crossfadeOutForeground(CROSSFADE_OUT_MS)
      dispatch({ type: 'PAUSE_FOREGROUND' })
    }

    advanceToNextStep()
  }, [audioState.activeRoutine, audioState.foregroundContent, engine, dispatch, advanceToNextStep])

  // ── End routine ─────────────────────────────────────────────────────
  const endRoutine = useCallback(() => {
    // Log incomplete session before clearing state
    if (routineStartTimeRef.current && audioState.activeRoutine) {
      const startedAt = routineStartTimeRef.current
      const durationSeconds = Math.round(
        (Date.now() - new Date(startedAt).getTime()) / 1000,
      )
      storageService.logListeningSession({
        contentType: 'routine',
        contentId: audioState.activeRoutine.routineId,
        startedAt,
        durationSeconds,
        completed: false,
      })
    }

    if (gapTimerRef.current) {
      clearTimeout(gapTimerRef.current)
      gapTimerRef.current = null
    }

    currentStepIndexRef.current = null
    routineIdRef.current = null
    routineStartTimeRef.current = null

    dispatch({ type: 'END_ROUTINE' })
  }, [audioState.activeRoutine, dispatch])

  // ── Interrupt handling ──────────────────────────────────────────────
  const confirmInterrupt = useCallback(() => {
    if (!pendingInterrupt) return
    endRoutine()
    pendingInterrupt.action()
    setPendingInterrupt(null)
  }, [pendingInterrupt, endRoutine])

  const cancelInterrupt = useCallback(() => {
    setPendingInterrupt(null)
  }, [])

  return {
    startRoutine,
    skipStep,
    endRoutine,
    pendingInterrupt,
    confirmInterrupt,
    cancelInterrupt,
    isRoutineActive,
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function resolveStepLabel(type: 'scene' | 'scripture' | 'story', contentId: string): string {
  if (type === 'scene') {
    return SCENE_BY_ID.get(contentId)?.name ?? 'Scene'
  }
  if (type === 'scripture') {
    const reading = resolveScriptureId(contentId)
    return reading?.title ?? 'Scripture'
  }
  return BEDTIME_STORY_BY_ID.get(contentId)?.title ?? 'Story'
}

function stepTypeToIcon(type: 'scene' | 'scripture' | 'story'): string {
  switch (type) {
    case 'scene':
      return 'Mountain'
    case 'scripture':
      return 'BookOpen'
    case 'story':
      return 'Moon'
  }
}
