export type VoiceGender = 'male' | 'female'
export type LengthCategory = 'short' | 'medium' | 'long'

export interface ScriptureReading {
  id: string
  title: string
  scriptureReference: string
  collectionId: string
  webText: string
  audioFilename: string
  durationSeconds: number
  voiceId: VoiceGender
  tags: string[]
}

export interface ScriptureCollection {
  id: string
  name: string
  readings: ScriptureReading[]
}

export interface BedtimeStory {
  id: string
  title: string
  description: string
  audioFilename: string
  durationSeconds: number
  voiceId: VoiceGender
  lengthCategory: LengthCategory
  tags: string[]
}

export type SoundCategory = 'nature' | 'environments' | 'spiritual' | 'instruments'
export type SoundMood = 'peaceful' | 'uplifting' | 'contemplative' | 'restful'
export type SoundActivity = 'prayer' | 'sleep' | 'study' | 'relaxation' | 'bible-reading'
export type SoundIntensity = 'very_calm' | 'moderate' | 'immersive'

export interface Sound {
  id: string
  name: string
  category: SoundCategory
  lucideIcon: string
  filename: string
  loopDurationMs: number
  tags: {
    mood: SoundMood[]
    activity: SoundActivity[]
    intensity: SoundIntensity
  }
}

export interface SoundCategoryGroup {
  category: SoundCategory
  label: string
  sounds: Sound[]
}

export type SceneAnimationCategory = 'drift' | 'pulse' | 'glow'

export interface ScenePreset {
  id: string
  name: string
  description: string
  artworkFilename: string
  sounds: { soundId: string; volume: number }[]
  tags: {
    mood: SoundMood[]
    activity: SoundActivity[]
    intensity: SoundIntensity
    scriptureTheme?: string[]
  }
  animationCategory: SceneAnimationCategory
  /**
   * Primary accent color for the scene, derived from its desaturated gradient.
   * Forward-looking — no consumer reads this yet.
   */
  themeColor?: string
}
