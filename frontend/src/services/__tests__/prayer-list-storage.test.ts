import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getPrayers,
  addPrayer,
  updatePrayer,
  deletePrayer,
  markAnswered,
  markPrayed,
  getPrayerCounts,
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
