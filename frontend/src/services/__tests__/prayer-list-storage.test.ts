import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getPrayers,
  addPrayer,
  updatePrayer,
  deletePrayer,
  markAnswered,
  markPrayed,
  getPrayerCounts,
  updateReminder,
  getActivePrayersWithReminders,
  getAnsweredThisMonth,
  hasShownRemindersToday,
  markRemindersShown,
  MAX_PRAYERS,
} from '../prayer-list-storage'
import type { PersonalPrayer } from '@/types/personal-prayer'

const PRAYER_LIST_KEY = 'wr_prayer_list'

function makePrayer(overrides: Partial<PersonalPrayer> = {}): PersonalPrayer {
  return {
    id: 'test-id-1',
    title: 'Test Prayer',
    description: 'Test description',
    category: 'health',
    status: 'active',
    createdAt: '2026-03-20T10:00:00.000Z',
    updatedAt: '2026-03-20T10:00:00.000Z',
    answeredAt: null,
    answeredNote: null,
    lastPrayedAt: null,
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('getPrayers', () => {
  it('returns empty array when key missing', () => {
    expect(getPrayers()).toEqual([])
  })

  it('returns empty array on corrupted JSON', () => {
    localStorage.setItem(PRAYER_LIST_KEY, '{not valid json!!!')
    expect(getPrayers()).toEqual([])
  })

  it('returns stored prayers', () => {
    const prayers = [makePrayer()]
    localStorage.setItem(PRAYER_LIST_KEY, JSON.stringify(prayers))
    expect(getPrayers()).toEqual(prayers)
  })
})

describe('addPrayer', () => {
  it('creates prayer with UUID and timestamps', () => {
    const result = addPrayer({
      title: 'Healing',
      description: 'For my family',
      category: 'health',
    })

    expect(result).not.toBeNull()
    expect(result!.id).toBeTruthy()
    expect(result!.title).toBe('Healing')
    expect(result!.description).toBe('For my family')
    expect(result!.category).toBe('health')
    expect(result!.status).toBe('active')
    expect(result!.createdAt).toBeTruthy()
    expect(result!.updatedAt).toBe(result!.createdAt)
    expect(result!.answeredAt).toBeNull()
    expect(result!.answeredNote).toBeNull()
    expect(result!.lastPrayedAt).toBeNull()

    // Verify it was persisted
    const stored = getPrayers()
    expect(stored).toHaveLength(1)
    expect(stored[0].id).toBe(result!.id)
  })

  it('returns null when at 200 limit', () => {
    const prayers = Array.from({ length: MAX_PRAYERS }, (_, i) =>
      makePrayer({ id: `id-${i}` }),
    )
    localStorage.setItem(PRAYER_LIST_KEY, JSON.stringify(prayers))

    const result = addPrayer({
      title: 'One more',
      description: '',
      category: 'other',
    })

    expect(result).toBeNull()
    expect(getPrayers()).toHaveLength(MAX_PRAYERS)
  })
})

describe('updatePrayer', () => {
  it('updates fields and updatedAt', () => {
    const prayer = makePrayer()
    localStorage.setItem(PRAYER_LIST_KEY, JSON.stringify([prayer]))

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-21T12:00:00.000Z'))

    updatePrayer(prayer.id, { title: 'Updated Title', category: 'family' })

    vi.useRealTimers()

    const stored = getPrayers()
    expect(stored[0].title).toBe('Updated Title')
    expect(stored[0].category).toBe('family')
    expect(stored[0].description).toBe('Test description') // unchanged
    expect(stored[0].updatedAt).toBe('2026-03-21T12:00:00.000Z')
  })
})

describe('deletePrayer', () => {
  it('removes prayer by ID', () => {
    const prayers = [makePrayer({ id: 'a' }), makePrayer({ id: 'b' })]
    localStorage.setItem(PRAYER_LIST_KEY, JSON.stringify(prayers))

    deletePrayer('a')

    const stored = getPrayers()
    expect(stored).toHaveLength(1)
    expect(stored[0].id).toBe('b')
  })
})

describe('markAnswered', () => {
  it('sets status, answeredAt, answeredNote', () => {
    const prayer = makePrayer()
    localStorage.setItem(PRAYER_LIST_KEY, JSON.stringify([prayer]))

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-21T14:00:00.000Z'))

    markAnswered(prayer.id, 'God provided healing')

    vi.useRealTimers()

    const stored = getPrayers()
    expect(stored[0].status).toBe('answered')
    expect(stored[0].answeredAt).toBe('2026-03-21T14:00:00.000Z')
    expect(stored[0].answeredNote).toBe('God provided healing')
    expect(stored[0].updatedAt).toBe('2026-03-21T14:00:00.000Z')
  })

  it('sets answeredNote to null when no note provided', () => {
    const prayer = makePrayer()
    localStorage.setItem(PRAYER_LIST_KEY, JSON.stringify([prayer]))

    markAnswered(prayer.id)

    const stored = getPrayers()
    expect(stored[0].status).toBe('answered')
    expect(stored[0].answeredNote).toBeNull()
  })
})

describe('markPrayed', () => {
  it('updates lastPrayedAt', () => {
    const prayer = makePrayer()
    localStorage.setItem(PRAYER_LIST_KEY, JSON.stringify([prayer]))

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-20T15:30:00.000Z'))

    markPrayed(prayer.id)

    vi.useRealTimers()

    const stored = getPrayers()
    expect(stored[0].lastPrayedAt).toBe('2026-03-20T15:30:00.000Z')
    expect(stored[0].updatedAt).toBe('2026-03-20T15:30:00.000Z')
  })
})

describe('getPrayerCounts', () => {
  it('returns correct counts', () => {
    const prayers = [
      makePrayer({ id: '1', status: 'active' }),
      makePrayer({ id: '2', status: 'active' }),
      makePrayer({ id: '3', status: 'answered' }),
    ]
    localStorage.setItem(PRAYER_LIST_KEY, JSON.stringify(prayers))

    const counts = getPrayerCounts()
    expect(counts).toEqual({ all: 3, active: 2, answered: 1 })
  })

  it('returns zeros when no prayers', () => {
    expect(getPrayerCounts()).toEqual({ all: 0, active: 0, answered: 0 })
  })
})

describe('updateReminder', () => {
  it('sets reminderEnabled and default time on toggle on', () => {
    const prayer = makePrayer()
    localStorage.setItem(PRAYER_LIST_KEY, JSON.stringify([prayer]))

    updateReminder(prayer.id, true)

    const stored = getPrayers()
    expect(stored[0].reminderEnabled).toBe(true)
    expect(stored[0].reminderTime).toBe('09:00')
  })

  it('preserves reminderTime when toggling off', () => {
    const prayer = makePrayer({ reminderEnabled: true, reminderTime: '14:00' })
    localStorage.setItem(PRAYER_LIST_KEY, JSON.stringify([prayer]))

    updateReminder(prayer.id, false)

    const stored = getPrayers()
    expect(stored[0].reminderEnabled).toBe(false)
    expect(stored[0].reminderTime).toBe('14:00')
  })

  it('sets custom time when provided', () => {
    const prayer = makePrayer()
    localStorage.setItem(PRAYER_LIST_KEY, JSON.stringify([prayer]))

    updateReminder(prayer.id, true, '07:30')

    const stored = getPrayers()
    expect(stored[0].reminderEnabled).toBe(true)
    expect(stored[0].reminderTime).toBe('07:30')
  })

  it('does not overwrite existing time when toggling on without time arg', () => {
    const prayer = makePrayer({ reminderEnabled: false, reminderTime: '14:00' })
    localStorage.setItem(PRAYER_LIST_KEY, JSON.stringify([prayer]))

    updateReminder(prayer.id, true)

    const stored = getPrayers()
    expect(stored[0].reminderTime).toBe('14:00')
  })
})

describe('getActivePrayersWithReminders', () => {
  it('returns only active prayers with reminders enabled', () => {
    const prayers = [
      makePrayer({ id: '1', status: 'active', reminderEnabled: true }),
      makePrayer({ id: '2', status: 'active', reminderEnabled: false }),
      makePrayer({ id: '3', status: 'answered', reminderEnabled: true }),
      makePrayer({ id: '4', status: 'active' }), // no reminderEnabled field
    ]
    localStorage.setItem(PRAYER_LIST_KEY, JSON.stringify(prayers))

    const result = getActivePrayersWithReminders()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('returns empty array when no reminders enabled', () => {
    const prayers = [makePrayer({ status: 'active' })]
    localStorage.setItem(PRAYER_LIST_KEY, JSON.stringify(prayers))

    expect(getActivePrayersWithReminders()).toEqual([])
  })
})

describe('getAnsweredThisMonth', () => {
  it('counts prayers answered in current month', () => {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15).toISOString()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString()

    const prayers = [
      makePrayer({ id: '1', status: 'answered', answeredAt: thisMonth }),
      makePrayer({ id: '2', status: 'answered', answeredAt: thisMonth }),
      makePrayer({ id: '3', status: 'answered', answeredAt: lastMonth }),
      makePrayer({ id: '4', status: 'active', answeredAt: null }),
    ]
    localStorage.setItem(PRAYER_LIST_KEY, JSON.stringify(prayers))

    expect(getAnsweredThisMonth()).toBe(2)
  })

  it('returns 0 when no answered prayers', () => {
    expect(getAnsweredThisMonth()).toBe(0)
  })
})

describe('hasShownRemindersToday', () => {
  it('returns false when no data', () => {
    expect(hasShownRemindersToday()).toBe(false)
  })

  it('returns true when shown today', () => {
    markRemindersShown(['id1', 'id2'])
    expect(hasShownRemindersToday()).toBe(true)
  })

  it('returns false for a different date', () => {
    localStorage.setItem(
      'wr_prayer_reminders_shown',
      JSON.stringify({ date: '2020-01-01', shownPrayerIds: ['id1'] }),
    )
    expect(hasShownRemindersToday()).toBe(false)
  })
})

describe('markRemindersShown', () => {
  it('stores date and prayer IDs', () => {
    markRemindersShown(['a', 'b'])

    const raw = localStorage.getItem('wr_prayer_reminders_shown')
    expect(raw).toBeTruthy()
    const data = JSON.parse(raw!)
    expect(data.shownPrayerIds).toEqual(['a', 'b'])
    expect(data.date).toBeTruthy()
  })
})

describe('backwards compatibility', () => {
  it('existing prayers without reminder fields work in all functions', () => {
    // Prayer without reminderEnabled or reminderTime (pre-Spec 19 format)
    const oldPrayer = {
      id: 'old-1',
      title: 'Old Prayer',
      description: 'Before reminders existed',
      category: 'health',
      status: 'active',
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
      answeredAt: null,
      answeredNote: null,
      lastPrayedAt: null,
    }
    localStorage.setItem(PRAYER_LIST_KEY, JSON.stringify([oldPrayer]))

    // All existing functions should work
    expect(getPrayers()).toHaveLength(1)
    expect(getPrayerCounts()).toEqual({ all: 1, active: 1, answered: 0 })
    expect(getActivePrayersWithReminders()).toEqual([])

    // Can update reminder on old prayer
    updateReminder('old-1', true)
    const stored = getPrayers()
    expect(stored[0].reminderEnabled).toBe(true)
    expect(stored[0].reminderTime).toBe('09:00')
  })
})
