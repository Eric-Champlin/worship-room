import { describe, it, expect } from 'vitest'
import {
  AVATAR_PRESETS,
  AVATAR_CATEGORIES,
  UNLOCKABLE_AVATARS,
  getAvatarById,
  isUnlockableAvatar,
  isPresetAvatar,
} from '../avatars'
import type { BadgeData } from '@/types/dashboard'
import { FRESH_ACTIVITY_COUNTS } from '../badges'

const FRESH_BADGES: BadgeData = {
  earned: {},
  newlyEarned: [],
  activityCounts: { ...FRESH_ACTIVITY_COUNTS },
}

describe('AVATAR_PRESETS', () => {
  it('defines exactly 16 presets', () => {
    expect(AVATAR_PRESETS).toHaveLength(16)
  })

  it('has 4 presets per category', () => {
    for (const category of AVATAR_CATEGORIES) {
      const count = AVATAR_PRESETS.filter((p) => p.category === category).length
      expect(count).toBe(4)
    }
  })

  it('all presets have IDs in {category}-{name} format', () => {
    for (const preset of AVATAR_PRESETS) {
      expect(preset.id).toMatch(/^(nature|faith|water|light)-[a-z]+$/)
    }
  })

  it('all presets have valid hex bgColor', () => {
    for (const preset of AVATAR_PRESETS) {
      expect(preset.bgColor).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('all presets have an icon component', () => {
    for (const preset of AVATAR_PRESETS) {
      expect(preset.icon).toBeDefined()
    }
  })

  it('all preset IDs are unique', () => {
    const ids = AVATAR_PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('UNLOCKABLE_AVATARS', () => {
  it('defines exactly 4 unlockables', () => {
    expect(UNLOCKABLE_AVATARS).toHaveLength(4)
  })

  it('all unlockables have gradient CSS', () => {
    for (const avatar of UNLOCKABLE_AVATARS) {
      expect(avatar.gradient).toContain('linear-gradient')
    }
  })

  it('all unlockables have icon and unlock check', () => {
    for (const avatar of UNLOCKABLE_AVATARS) {
      expect(avatar.icon).toBeDefined()
      expect(typeof avatar.unlockCheck).toBe('function')
    }
  })

  it('Golden Dove unlocks with streak_365 badge', () => {
    const goldenDove = UNLOCKABLE_AVATARS.find((a) => a.id === 'unlock-golden-dove')!
    expect(goldenDove.unlockCheck(FRESH_BADGES)).toBe(false)
    expect(
      goldenDove.unlockCheck({
        ...FRESH_BADGES,
        earned: { streak_365: { earnedAt: '2026-01-01' } },
      }),
    ).toBe(true)
  })

  it('Crystal Tree unlocks with level_6 badge', () => {
    const crystalTree = UNLOCKABLE_AVATARS.find((a) => a.id === 'unlock-crystal-tree')!
    expect(crystalTree.unlockCheck(FRESH_BADGES)).toBe(false)
    expect(
      crystalTree.unlockCheck({
        ...FRESH_BADGES,
        earned: { level_6: { earnedAt: '2026-01-01' } },
      }),
    ).toBe(true)
  })

  it('Phoenix Flame unlocks with 10+ full worship days', () => {
    const phoenix = UNLOCKABLE_AVATARS.find((a) => a.id === 'unlock-phoenix-flame')!
    expect(phoenix.unlockCheck(FRESH_BADGES)).toBe(false)
    expect(
      phoenix.unlockCheck({
        ...FRESH_BADGES,
        earned: { full_worship_day: { earnedAt: '2026-01-01', count: 9 } },
      }),
    ).toBe(false)
    expect(
      phoenix.unlockCheck({
        ...FRESH_BADGES,
        earned: { full_worship_day: { earnedAt: '2026-01-01', count: 10 } },
      }),
    ).toBe(true)
  })

  it('Diamond Crown unlocks with all 7 streak badges', () => {
    const diamond = UNLOCKABLE_AVATARS.find((a) => a.id === 'unlock-diamond-crown')!
    expect(diamond.unlockCheck(FRESH_BADGES)).toBe(false)

    // Missing one streak badge
    const partialStreaks: BadgeData = {
      ...FRESH_BADGES,
      earned: {
        streak_7: { earnedAt: '2026-01-01' },
        streak_14: { earnedAt: '2026-01-01' },
        streak_30: { earnedAt: '2026-01-01' },
        streak_60: { earnedAt: '2026-01-01' },
        streak_90: { earnedAt: '2026-01-01' },
        streak_180: { earnedAt: '2026-01-01' },
      },
    }
    expect(diamond.unlockCheck(partialStreaks)).toBe(false)

    // All streak badges
    const allStreaks: BadgeData = {
      ...partialStreaks,
      earned: {
        ...partialStreaks.earned,
        streak_365: { earnedAt: '2026-01-01' },
      },
    }
    expect(diamond.unlockCheck(allStreaks)).toBe(true)
  })
})

describe('getAvatarById', () => {
  it('returns correct preset for valid ID', () => {
    const dove = getAvatarById('nature-dove')
    expect(dove).not.toBeNull()
    expect(dove!.id).toBe('nature-dove')
    expect(dove!.name).toBe('Dove')
  })

  it('returns correct unlockable for valid ID', () => {
    const golden = getAvatarById('unlock-golden-dove')
    expect(golden).not.toBeNull()
    expect(golden!.id).toBe('unlock-golden-dove')
  })

  it('maps "default" to nature-dove', () => {
    const result = getAvatarById('default')
    expect(result).not.toBeNull()
    expect(result!.id).toBe('nature-dove')
  })

  it('returns null for unknown ID', () => {
    expect(getAvatarById('nonexistent')).toBeNull()
    expect(getAvatarById('')).toBeNull()
  })
})

describe('type guards', () => {
  it('isUnlockableAvatar returns true for unlockables', () => {
    const avatar = getAvatarById('unlock-golden-dove')!
    expect(isUnlockableAvatar(avatar)).toBe(true)
  })

  it('isUnlockableAvatar returns false for presets', () => {
    const avatar = getAvatarById('nature-dove')!
    expect(isUnlockableAvatar(avatar)).toBe(false)
  })

  it('isPresetAvatar returns true for presets', () => {
    const avatar = getAvatarById('nature-dove')!
    expect(isPresetAvatar(avatar)).toBe(true)
  })

  it('isPresetAvatar returns false for unlockables', () => {
    const avatar = getAvatarById('unlock-golden-dove')!
    expect(isPresetAvatar(avatar)).toBe(false)
  })
})
