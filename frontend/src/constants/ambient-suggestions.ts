import { SCENE_BY_ID } from '@/data/scenes'
import type { ScenePreset } from '@/types/music'

export type AmbientContext =
  | 'pray'
  | 'journal'
  | 'meditate'
  | 'breathing'
  | 'soaking'
  | 'other-meditation'
  | 'bible-reading'

const AMBIENT_SCENE_IDS: Record<AmbientContext, string[]> = {
  pray: ['the-upper-room', 'ember-and-stone', 'still-waters'],
  journal: ['midnight-rain', 'morning-mist', 'starfield'],
  meditate: ['garden-of-gethsemane', 'still-waters', 'mountain-refuge'],
  breathing: ['still-waters', 'morning-mist', 'garden-of-gethsemane'],
  soaking: ['the-upper-room', 'starfield', 'garden-of-gethsemane'],
  'other-meditation': ['garden-of-gethsemane', 'still-waters', 'mountain-refuge'],
  'bible-reading': ['peaceful-study', 'evening-scripture', 'sacred-space'],
}

export function getSuggestedScenes(context: AmbientContext): ScenePreset[] {
  const ids = AMBIENT_SCENE_IDS[context]
  return ids.map((id) => SCENE_BY_ID.get(id)).filter(Boolean) as ScenePreset[]
}
