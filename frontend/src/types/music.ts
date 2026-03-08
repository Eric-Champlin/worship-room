export type SoundCategory = 'nature' | 'environments' | 'spiritual' | 'instruments'
export type SoundMood = 'peaceful' | 'uplifting' | 'contemplative' | 'restful'
export type SoundActivity = 'prayer' | 'sleep' | 'study' | 'relaxation'
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
}
