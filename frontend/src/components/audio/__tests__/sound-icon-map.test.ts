import { describe, it, expect } from 'vitest'
import { getSoundIcon } from '../sound-icon-map'
import { SOUND_CATALOG } from '@/data/sound-catalog'
import { Music } from 'lucide-react'

describe('getSoundIcon', () => {
  it('returns a component for every icon name in SOUND_CATALOG', () => {
    const iconNames = new Set(SOUND_CATALOG.map((s) => s.lucideIcon))
    for (const name of iconNames) {
      const icon = getSoundIcon(name)
      expect(icon).toBeDefined()
      expect(icon).toHaveProperty('render')
    }
  })

  it('returns fallback Music icon for unknown names', () => {
    expect(getSoundIcon('NonExistentIcon')).toBe(Music)
    expect(getSoundIcon('')).toBe(Music)
  })
})
