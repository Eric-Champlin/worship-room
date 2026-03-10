import { useMemo } from 'react'
import { SCENE_BY_ID } from '@/data/scenes'

export type TimeBracket = 'morning' | 'afternoon' | 'evening' | 'night'

export interface ContentRecommendation {
  id: string
  type: 'scene' | 'sleep' | 'playlist'
  title: string
  subtitle?: string
  artworkFilename?: string
}

const BRACKET_CONFIG: Record<
  TimeBracket,
  { heading: string; sceneIds: string[]; types: ContentRecommendation['type'][] }
> = {
  morning: {
    heading: 'Suggested for You',
    sceneIds: ['morning-mist', 'mountain-refuge', 'still-waters'],
    types: ['scene', 'playlist'],
  },
  afternoon: {
    heading: 'Great for Focus',
    sceneIds: ['ember-and-stone', 'the-upper-room', 'starfield'],
    types: ['scene'],
  },
  evening: {
    heading: 'Wind Down Tonight',
    sceneIds: ['garden-of-gethsemane', 'still-waters', 'midnight-rain'],
    types: ['scene', 'sleep'],
  },
  night: {
    heading: 'Ready for Rest',
    sceneIds: ['midnight-rain', 'starfield', 'garden-of-gethsemane'],
    types: ['sleep', 'scene'],
  },
}

function getTimeBracket(hour?: number): TimeBracket {
  const h = hour ?? new Date().getHours()
  if (h >= 6 && h < 12) return 'morning'
  if (h >= 12 && h < 18) return 'afternoon'
  if (h >= 18 && h < 22) return 'evening'
  return 'night'
}

export function useTimeOfDayRecommendations(hour?: number) {
  const timeBracket = useMemo(() => getTimeBracket(hour), [hour])

  const items = useMemo(() => {
    const config = BRACKET_CONFIG[timeBracket]
    const recommendations: ContentRecommendation[] = []

    for (const sceneId of config.sceneIds) {
      const scene = SCENE_BY_ID.get(sceneId)
      if (!scene) continue
      recommendations.push({
        id: scene.id,
        type: 'scene',
        title: scene.name,
        subtitle: scene.description,
        artworkFilename: scene.artworkFilename,
      })
    }

    return recommendations
  }, [timeBracket])

  return {
    heading: BRACKET_CONFIG[timeBracket].heading,
    items,
    timeBracket,
  }
}
