export interface ActiveSound {
  soundId: string
  volume: number
  label: string
}

export interface ForegroundContent {
  contentId: string
  contentType: 'scripture' | 'story'
  title: string
  duration: number
  playbackPosition: number
  isPlaying: boolean
  scriptureReference?: string
  voiceGender?: 'male' | 'female'
  webText?: string
}

export interface SleepTimer {
  isActive: boolean
  isPaused: boolean
  totalDurationMs: number
  fadeDurationMs: number
  startTime: number          // Date.now() when timer started (or last resumed)
  pausedElapsedMs: number    // accumulated elapsed time before current running segment
  phase: 'full-volume' | 'fading' | 'complete'
}

export interface RoutineStep {
  stepId: string
  type: 'scene' | 'scripture' | 'story' | 'bible-navigate'
  contentId: string
  label: string
  icon: string
  transitionGapMinutes: number
}

export interface AudioRoutine {
  routineId: string
  routineName: string
  currentStepIndex: number
  steps: RoutineStep[]
  phase: 'playing' | 'transition-gap' | 'ambient-only'
  sleepTimerConfig: { durationMinutes: number; fadeDurationMinutes: number }
}

export interface AudioState {
  activeSounds: ActiveSound[]
  foregroundContent: ForegroundContent | null
  masterVolume: number
  foregroundBackgroundBalance: number
  isPlaying: boolean
  sleepTimer: SleepTimer | null
  activeRoutine: AudioRoutine | null
  pillVisible: boolean
  drawerOpen: boolean
  currentSceneName: string | null
  currentSceneId: string | null
  /** Incremented each time foreground audio reaches its natural end (not manual pause) */
  foregroundEndedCounter: number
  /** Bible reader reading context for media session metadata (BB-20) */
  readingContext: { book: string; chapter: number } | null
}

export type AudioAction =
  | { type: 'ADD_SOUND'; payload: ActiveSound & { url: string } }
  | { type: 'REMOVE_SOUND'; payload: { soundId: string } }
  | { type: 'SET_SOUND_VOLUME'; payload: { soundId: string; volume: number } }
  | { type: 'SET_MASTER_VOLUME'; payload: { volume: number } }
  | { type: 'PLAY_ALL' }
  | { type: 'PAUSE_ALL' }
  | { type: 'STOP_ALL' }
  | { type: 'START_FOREGROUND'; payload: Omit<ForegroundContent, 'playbackPosition' | 'isPlaying'> }
  | { type: 'PAUSE_FOREGROUND' }
  | { type: 'FOREGROUND_ENDED' }
  | { type: 'SEEK_FOREGROUND'; payload: { position: number } }
  | { type: 'UPDATE_FOREGROUND_POSITION'; payload: { position: number } }
  | { type: 'SET_FOREGROUND_BACKGROUND_BALANCE'; payload: { balance: number } }
  | { type: 'SET_SLEEP_TIMER'; payload: SleepTimer | null }
  | { type: 'TICK_TIMER' }
  | { type: 'START_SLEEP_TIMER'; payload: { totalDurationMs: number; fadeDurationMs: number } }
  | { type: 'PAUSE_SLEEP_TIMER' }
  | { type: 'RESUME_SLEEP_TIMER' }
  | { type: 'CANCEL_SLEEP_TIMER' }
  | { type: 'COMPLETE_SLEEP_TIMER' }
  | { type: 'UPDATE_TIMER_PHASE'; payload: { phase: SleepTimer['phase'] } }
  | { type: 'OPEN_DRAWER' }
  | { type: 'CLOSE_DRAWER' }
  | { type: 'START_ROUTINE'; payload: AudioRoutine }
  | { type: 'ADVANCE_ROUTINE_STEP' }
  | { type: 'SKIP_ROUTINE_STEP' }
  | { type: 'SET_ROUTINE_PHASE'; payload: { phase: AudioRoutine['phase'] } }
  | { type: 'END_ROUTINE' }
  | { type: 'SET_SCENE_NAME'; payload: { sceneName: string | null; sceneId: string | null } }
  | { type: 'SET_READING_CONTEXT'; payload: { book: string; chapter: number } }
  | { type: 'CLEAR_READING_CONTEXT' }
