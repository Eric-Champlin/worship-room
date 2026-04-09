import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BibleExportV1, MergeResult } from '@/types/bible-export'

// Mock all 12 store mutation functions
vi.mock('@/lib/bible/highlightStore', () => ({
  replaceAllHighlights: vi.fn(),
  mergeInHighlights: vi.fn(() => ({ added: 0, updated: 0, skipped: 0 })),
}))
vi.mock('@/lib/bible/bookmarkStore', () => ({
  replaceAllBookmarks: vi.fn(),
  mergeInBookmarks: vi.fn(() => ({ added: 0, updated: 0, skipped: 0 })),
}))
vi.mock('@/lib/bible/notes/store', () => ({
  replaceAllNotes: vi.fn(),
  mergeInNotes: vi.fn(() => ({ added: 0, updated: 0, skipped: 0 })),
}))
vi.mock('@/lib/bible/journalStore', () => ({
  replaceAllJournals: vi.fn(),
  mergeInJournals: vi.fn(() => ({ added: 0, updated: 0, skipped: 0 })),
}))
vi.mock('@/services/prayer-list-storage', () => ({
  replaceAllPrayers: vi.fn(),
  mergeInPrayers: vi.fn(() => ({ added: 0, updated: 0, skipped: 0 })),
}))
vi.mock('@/services/meditation-storage', () => ({
  replaceAllMeditations: vi.fn(),
  mergeInMeditations: vi.fn(() => ({ added: 0, updated: 0, skipped: 0 })),
}))

import { applyReplace, applyMerge } from '../importApplier'
import { replaceAllHighlights, mergeInHighlights } from '@/lib/bible/highlightStore'
import { replaceAllBookmarks, mergeInBookmarks } from '@/lib/bible/bookmarkStore'
import { replaceAllNotes, mergeInNotes } from '@/lib/bible/notes/store'
import { replaceAllJournals, mergeInJournals } from '@/lib/bible/journalStore'
import { replaceAllPrayers, mergeInPrayers } from '@/services/prayer-list-storage'
import { replaceAllMeditations, mergeInMeditations } from '@/services/meditation-storage'

function makeData(counts: {
  highlights?: number
  bookmarks?: number
  notes?: number
  prayers?: number
  journals?: number
  meditations?: number
} = {}): BibleExportV1['data'] {
  return {
    highlights: Array.from({ length: counts.highlights ?? 0 }, (_, i) => ({
      id: `h${i}`, book: 'john', chapter: 3, startVerse: 16, endVerse: 16,
      color: 'peace' as const, createdAt: 1000, updatedAt: 1000,
    })),
    bookmarks: Array.from({ length: counts.bookmarks ?? 0 }, (_, i) => ({
      id: `b${i}`, book: 'psalms', chapter: 23, startVerse: 1, endVerse: 6, createdAt: 1000,
    })),
    notes: Array.from({ length: counts.notes ?? 0 }, (_, i) => ({
      id: `n${i}`, book: 'romans', chapter: 8, startVerse: 28, endVerse: 28,
      body: 'note', createdAt: 1000, updatedAt: 1000,
    })),
    prayers: Array.from({ length: counts.prayers ?? 0 }, (_, i) => ({
      id: `p${i}`, title: 'prayer', description: 'desc', category: 'guidance' as const,
      status: 'active' as const, createdAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-04-01T10:00:00.000Z', answeredAt: null, answeredNote: null, lastPrayedAt: null,
    })),
    journals: Array.from({ length: counts.journals ?? 0 }, (_, i) => ({
      id: `j${i}`, body: 'journal', createdAt: 1000, updatedAt: 1000,
    })),
    meditations: Array.from({ length: counts.meditations ?? 0 }, (_, i) => ({
      id: `m${i}`, type: 'breathing' as const, date: '2026-04-01',
      durationMinutes: 5, completedAt: '2026-04-01T10:05:00.000Z',
    })),
  }
}

describe('applyReplace', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls all 6 replaceAll functions with correct data', () => {
    const data = makeData({ highlights: 2, bookmarks: 1, notes: 1, prayers: 1, journals: 1, meditations: 1 })
    applyReplace(data)

    expect(replaceAllHighlights).toHaveBeenCalledWith(data.highlights)
    expect(replaceAllBookmarks).toHaveBeenCalledWith(data.bookmarks)
    expect(replaceAllNotes).toHaveBeenCalledWith(data.notes)
    expect(replaceAllJournals).toHaveBeenCalledWith(data.journals)
    expect(replaceAllPrayers).toHaveBeenCalledWith(data.prayers)
    expect(replaceAllMeditations).toHaveBeenCalledWith(data.meditations)
  })

  it('returns correct total count', () => {
    const data = makeData({ highlights: 3, bookmarks: 2, notes: 1, prayers: 1, journals: 2, meditations: 1 })
    const result = applyReplace(data)
    expect(result.totalItems).toBe(10)
  })

  it('with empty data calls all stores with []', () => {
    const data = makeData()
    const result = applyReplace(data)

    expect(replaceAllHighlights).toHaveBeenCalledWith([])
    expect(result.totalItems).toBe(0)
  })

  it('returns mode "replace"', () => {
    const result = applyReplace(makeData())
    expect(result.mode).toBe('replace')
  })
})

describe('applyMerge', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls all 6 mergeIn functions with correct data', () => {
    const data = makeData({ highlights: 1, bookmarks: 1, notes: 1, prayers: 1, journals: 1, meditations: 1 })
    applyMerge(data)

    expect(mergeInHighlights).toHaveBeenCalledWith(data.highlights)
    expect(mergeInBookmarks).toHaveBeenCalledWith(data.bookmarks)
    expect(mergeInNotes).toHaveBeenCalledWith(data.notes)
    expect(mergeInJournals).toHaveBeenCalledWith(data.journals)
    expect(mergeInPrayers).toHaveBeenCalledWith(data.prayers)
    expect(mergeInMeditations).toHaveBeenCalledWith(data.meditations)
  })

  it('sums counts correctly (total = added + updated)', () => {
    vi.mocked(mergeInHighlights).mockReturnValue({ added: 2, updated: 1, skipped: 0 })
    vi.mocked(mergeInBookmarks).mockReturnValue({ added: 1, updated: 0, skipped: 1 })
    vi.mocked(mergeInNotes).mockReturnValue({ added: 0, updated: 1, skipped: 0 })
    vi.mocked(mergeInJournals).mockReturnValue({ added: 1, updated: 0, skipped: 0 })
    vi.mocked(mergeInPrayers).mockReturnValue({ added: 0, updated: 0, skipped: 2 })
    vi.mocked(mergeInMeditations).mockReturnValue({ added: 1, updated: 1, skipped: 0 })

    const result = applyMerge(makeData({ highlights: 3, bookmarks: 2, notes: 1, journals: 1, prayers: 2, meditations: 2 }))
    // total = (2+1) + (1+0) + (0+1) + (1+0) + (0+0) + (1+1) = 8
    expect(result.totalItems).toBe(8)
  })

  it('returns per-store MergeResult objects', () => {
    const hlResult: MergeResult = { added: 1, updated: 0, skipped: 0 }
    vi.mocked(mergeInHighlights).mockReturnValue(hlResult)

    const result = applyMerge(makeData({ highlights: 1 }))
    expect(result.highlights).toEqual(hlResult)
  })

  it('returns mode "merge"', () => {
    const result = applyMerge(makeData())
    expect(result.mode).toBe('merge')
  })
})
