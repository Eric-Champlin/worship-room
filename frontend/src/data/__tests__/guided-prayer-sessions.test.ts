import { describe, it, expect } from 'vitest'
import {
  GUIDED_PRAYER_SESSIONS,
  THEME_SCENE_MAP,
  THEME_ICON_MAP,
} from '../guided-prayer-sessions'
import { SCENE_BY_ID } from '../scenes'
import type { GuidedPrayerTheme } from '@/types/guided-prayer'

describe('GUIDED_PRAYER_SESSIONS', () => {
  it('has exactly 8 sessions', () => {
    expect(GUIDED_PRAYER_SESSIONS).toHaveLength(8)
  })

  it('all session IDs are unique', () => {
    const ids = GUIDED_PRAYER_SESSIONS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('each session has all required fields', () => {
    for (const session of GUIDED_PRAYER_SESSIONS) {
      expect(session.id).toBeTruthy()
      expect(session.title).toBeTruthy()
      expect(session.description).toBeTruthy()
      expect(session.theme).toBeTruthy()
      expect([5, 10, 15]).toContain(session.durationMinutes)
      expect(session.icon).toBeTruthy()
      expect(session.completionVerse.reference).toBeTruthy()
      expect(session.completionVerse.text).toBeTruthy()
      expect(session.script.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('segment durations sum to approximately durationMinutes (within 30s)', () => {
    for (const session of GUIDED_PRAYER_SESSIONS) {
      const totalSeconds = session.script.reduce(
        (sum, seg) => sum + seg.durationSeconds,
        0
      )
      const targetSeconds = session.durationMinutes * 60
      const diff = Math.abs(totalSeconds - targetSeconds)
      expect(
        diff,
        `Session "${session.title}" total ${totalSeconds}s vs target ${targetSeconds}s (diff ${diff}s)`
      ).toBeLessThanOrEqual(30)
    }
  })

  it('no two consecutive silence segments in any script', () => {
    for (const session of GUIDED_PRAYER_SESSIONS) {
      for (let i = 1; i < session.script.length; i++) {
        if (session.script[i].type === 'silence') {
          expect(
            session.script[i - 1].type,
            `Session "${session.title}" has consecutive silences at index ${i - 1} and ${i}`
          ).not.toBe('silence')
        }
      }
    }
  })

  it('each narration segment has non-empty text', () => {
    for (const session of GUIDED_PRAYER_SESSIONS) {
      for (const seg of session.script) {
        if (seg.type === 'narration') {
          expect(
            seg.text.length,
            `Session "${session.title}" has empty narration text`
          ).toBeGreaterThan(0)
        }
      }
    }
  })

  it('each segment has a positive duration', () => {
    for (const session of GUIDED_PRAYER_SESSIONS) {
      for (const seg of session.script) {
        expect(
          seg.durationSeconds,
          `Session "${session.title}" has non-positive duration`
        ).toBeGreaterThan(0)
      }
    }
  })
})

describe('THEME_SCENE_MAP', () => {
  const allThemes: GuidedPrayerTheme[] = [
    'peace',
    'comfort',
    'gratitude',
    'forgiveness',
    'strength',
    'healing',
    'morning',
    'evening',
  ]

  it('covers all 8 themes', () => {
    for (const theme of allThemes) {
      expect(
        THEME_SCENE_MAP[theme],
        `Missing scene mapping for theme "${theme}"`
      ).toBeTruthy()
    }
  })

  it('all scene IDs exist in SCENE_BY_ID', () => {
    for (const [theme, sceneId] of Object.entries(THEME_SCENE_MAP)) {
      expect(
        SCENE_BY_ID.has(sceneId),
        `Theme "${theme}" maps to unknown scene "${sceneId}"`
      ).toBe(true)
    }
  })
})

describe('THEME_ICON_MAP', () => {
  const allThemes: GuidedPrayerTheme[] = [
    'peace',
    'comfort',
    'gratitude',
    'forgiveness',
    'strength',
    'healing',
    'morning',
    'evening',
  ]

  it('covers all 8 themes', () => {
    for (const theme of allThemes) {
      expect(
        THEME_ICON_MAP[theme],
        `Missing icon mapping for theme "${theme}"`
      ).toBeTruthy()
    }
  })
})
