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
  remainingSeconds: number
  fadeDurationSeconds: number
}

export interface RoutineStep {
  stepId: string
  label: string
  icon: string
}

export interface AudioRoutine {
  routineId: string
  currentStepIndex: number
  steps: RoutineStep[]
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
  | { type: 'SEEK_FOREGROUND'; payload: { position: number } }
  | { type: 'UPDATE_FOREGROUND_POSITION'; payload: { position: number } }
  | { type: 'SET_FOREGROUND_BACKGROUND_BALANCE'; payload: { balance: number } }
  | { type: 'SET_SLEEP_TIMER'; payload: SleepTimer | null }
  | { type: 'TICK_TIMER' }
  | { type: 'OPEN_DRAWER' }
  | { type: 'CLOSE_DRAWER' }
  | { type: 'START_ROUTINE'; payload: AudioRoutine }
  | { type: 'ADVANCE_ROUTINE_STEP' }
  | { type: 'SKIP_ROUTINE_STEP' }
  | { type: 'SET_SCENE_NAME'; payload: { sceneName: string | null } }
