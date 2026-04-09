import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Highlight, Bookmark, Note, JournalEntry } from '@/types/bible'
import type { PersonalPrayer } from '@/types/personal-prayer'
import type { MeditationSession } from '@/types/meditation'
import { CURRENT_SCHEMA_VERSION, APP_VERSION } from '@/types/bible-export'

// Mock all 6 stores
vi.mock('@/lib/bible/highlightStore', () => ({
  getAllHighlights: vi.fn(() => []),
}))
vi.mock('@/lib/bible/bookmarkStore', () => ({
  getAllBookmarks: vi.fn(() => []),
}))
vi.mock('@/lib/bible/notes/store', () => ({
  getAllNotes: vi.fn(() => []),
}))
vi.mock('@/lib/bible/journalStore', () => ({
  getAllJournalEntries: vi.fn(() => []),
}))
vi.mock('@/services/prayer-list-storage', () => ({
  getPrayers: vi.fn(() => []),
}))
vi.mock('@/services/meditation-storage', () => ({
  getMeditationHistory: vi.fn(() => []),
}))

import { buildExport } from '../exportBuilder'
import { getAllHighlights } from '@/lib/bible/highlightStore'
import { getAllBookmarks } from '@/lib/bible/bookmarkStore'
import { getAllNotes } from '@/lib/bible/notes/store'
import { getAllJournalEntries } from '@/lib/bible/journalStore'
import { getPrayers } from '@/services/prayer-list-storage'
import { getMeditationHistory } from '@/services/meditation-storage'

// --- Factories ---

function makeHighlight(overrides: Partial<Highlight> = {}): Highlight {
  return {
    id: 'h1',
    book: 'john',
    chapter: 3,
    startVerse: 16,
    endVerse: 16,
    color: 'peace',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: 'b1',
    book: 'psalms',
    chapter: 23,
    startVerse: 1,
    endVerse: 6,
    createdAt: Date.now(),
    ...overrides,
  }
}

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'n1',
    book: 'romans',
    chapter: 8,
    startVerse: 28,
    endVerse: 28,
    body: 'All things work together for good',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

function makeJournal(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: 'j1',
    body: 'Today I reflected on grace.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

function makePrayer(overrides: Partial<PersonalPrayer> = {}): PersonalPrayer {
  return {
    id: 'p1',
    title: 'Guidance',
    description: 'Lord, guide my steps.',
    category: 'guidance',
    status: 'active',
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
    answeredAt: null,
    answeredNote: null,
    lastPrayedAt: null,
    ...overrides,
  }
}

function makeMeditation(overrides: Partial<MeditationSession> = {}): MeditationSession {
  return {
    id: 'm1',
    type: 'breathing',
    date: '2026-04-01',
    durationMinutes: 5,
    completedAt: '2026-04-01T10:05:00.000Z',
    ...overrides,
  }
}

describe('buildExport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('produces valid envelope with empty stores', () => {
    const result = buildExport()

    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(result.appVersion).toBe(APP_VERSION)
    expect(result.data.highlights).toEqual([])
    expect(result.data.bookmarks).toEqual([])
    expect(result.data.notes).toEqual([])
    expect(result.data.prayers).toEqual([])
    expect(result.data.journals).toEqual([])
    expect(result.data.meditations).toEqual([])
  })

  it('includes all records from populated stores', () => {
    const highlight = makeHighlight()
    const bookmark = makeBookmark()
    const note = makeNote()
    const journal = makeJournal({
      verseContext: { book: 'john', chapter: 3, startVerse: 16, endVerse: 16, reference: 'John 3:16' },
    })
    const prayer = makePrayer({
      verseContext: { book: 'psalms', chapter: 23, verse: 1, reference: 'Psalm 23:1' },
    })
    const meditation = makeMeditation({
      verseContext: { book: 'romans', chapter: 8, startVerse: 28, endVerse: 28, reference: 'Romans 8:28' },
    })

    vi.mocked(getAllHighlights).mockReturnValue([highlight])
    vi.mocked(getAllBookmarks).mockReturnValue([bookmark])
    vi.mocked(getAllNotes).mockReturnValue([note])
    vi.mocked(getAllJournalEntries).mockReturnValue([journal])
    vi.mocked(getPrayers).mockReturnValue([prayer])
    vi.mocked(getMeditationHistory).mockReturnValue([meditation])

    const result = buildExport()

    expect(result.data.highlights).toEqual([highlight])
    expect(result.data.bookmarks).toEqual([bookmark])
    expect(result.data.notes).toEqual([note])
    expect(result.data.journals).toEqual([journal])
    expect(result.data.prayers).toEqual([prayer])
    expect(result.data.meditations).toEqual([meditation])
  })

  it('excludes prayers without verseContext', () => {
    const withContext = makePrayer({
      id: 'p-with',
      verseContext: { book: 'john', chapter: 3, verse: 16, reference: 'John 3:16' },
    })
    const withoutContext = makePrayer({ id: 'p-without' })

    vi.mocked(getPrayers).mockReturnValue([withContext, withoutContext])

    const result = buildExport()

    expect(result.data.prayers).toEqual([withContext])
    expect(result.data.prayers).toHaveLength(1)
  })

  it('excludes journals without verseContext', () => {
    const withContext = makeJournal({
      id: 'j-with',
      verseContext: { book: 'psalms', chapter: 23, startVerse: 1, endVerse: 6, reference: 'Psalm 23:1-6' },
    })
    const withoutContext = makeJournal({ id: 'j-without' })

    vi.mocked(getAllJournalEntries).mockReturnValue([withContext, withoutContext])

    const result = buildExport()

    expect(result.data.journals).toEqual([withContext])
    expect(result.data.journals).toHaveLength(1)
  })

  it('excludes meditations without verseContext', () => {
    const withContext = makeMeditation({
      id: 'm-with',
      verseContext: { book: 'romans', chapter: 8, startVerse: 28, endVerse: 28, reference: 'Romans 8:28' },
    })
    const withoutContext = makeMeditation({ id: 'm-without' })

    vi.mocked(getMeditationHistory).mockReturnValue([withContext, withoutContext])

    const result = buildExport()

    expect(result.data.meditations).toEqual([withContext])
    expect(result.data.meditations).toHaveLength(1)
  })

  it('filters mixed records correctly — only verse-linked included', () => {
    const prayerWith = makePrayer({
      id: 'p1',
      verseContext: { book: 'john', chapter: 3, verse: 16, reference: 'John 3:16' },
    })
    const prayerWithout1 = makePrayer({ id: 'p2' })
    const prayerWithout2 = makePrayer({ id: 'p3' })

    vi.mocked(getPrayers).mockReturnValue([prayerWith, prayerWithout1, prayerWithout2])

    const result = buildExport()

    expect(result.data.prayers).toHaveLength(1)
    expect(result.data.prayers[0].id).toBe('p1')
  })

  it('exportedAt is a valid ISO 8601 timestamp', () => {
    const result = buildExport()
    const parsed = new Date(result.exportedAt)

    expect(parsed.toISOString()).toBe(result.exportedAt)
    expect(Number.isNaN(parsed.getTime())).toBe(false)
  })

  it('schemaVersion is 1', () => {
    const result = buildExport()
    expect(result.schemaVersion).toBe(1)
  })

  it('appVersion matches APP_VERSION constant', () => {
    const result = buildExport()
    expect(result.appVersion).toBe('worship-room-bible-wave-1')
  })
})
