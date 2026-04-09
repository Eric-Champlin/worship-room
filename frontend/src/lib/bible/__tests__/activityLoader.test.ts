import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Highlight, Bookmark, Note, JournalEntry } from '@/types/bible'
import type { MeditationSession } from '@/types/meditation'
import type { ActivityItem, ActivityFilter } from '@/types/my-bible'

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

vi.mock('@/services/meditation-storage', () => ({
  getMeditationHistory: vi.fn(() => []),
}))

import { getAllHighlights } from '@/lib/bible/highlightStore'
import { getAllBookmarks } from '@/lib/bible/bookmarkStore'
import { getAllNotes } from '@/lib/bible/notes/store'
import { getAllJournalEntries } from '@/lib/bible/journalStore'
import { getMeditationHistory } from '@/services/meditation-storage'
import { loadAllActivity, filterActivity, sortActivity } from '../activityLoader'

const mockGetAllHighlights = vi.mocked(getAllHighlights)
const mockGetAllBookmarks = vi.mocked(getAllBookmarks)
const mockGetAllNotes = vi.mocked(getAllNotes)
const mockGetAllJournalEntries = vi.mocked(getAllJournalEntries)
const mockGetMeditationHistory = vi.mocked(getMeditationHistory)

function makeHighlight(overrides: Partial<Highlight> = {}): Highlight {
  return {
    id: 'hl-1',
    book: 'john',
    chapter: 3,
    startVerse: 16,
    endVerse: 16,
    color: 'joy',
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  }
}

function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: 'bm-1',
    book: 'john',
    chapter: 3,
    startVerse: 16,
    endVerse: 16,
    createdAt: 2000,
    ...overrides,
  }
}

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    book: 'john',
    chapter: 3,
    startVerse: 16,
    endVerse: 16,
    body: 'My note',
    createdAt: 3000,
    updatedAt: 3000,
    ...overrides,
  }
}

function makeMeditationSession(overrides: Partial<MeditationSession> = {}): MeditationSession {
  return {
    id: 'med-1',
    type: 'soaking',
    date: '2026-04-09',
    durationMinutes: 10,
    completedAt: '2026-04-09T12:00:00.000Z',
    verseContext: {
      book: 'john',
      chapter: 3,
      startVerse: 16,
      endVerse: 18,
      reference: 'John 3:16–18',
    },
    ...overrides,
  }
}

function makeJournalEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: 'journal-1',
    body: 'My journal reflection',
    createdAt: 5000,
    updatedAt: 5000,
    verseContext: {
      book: 'john',
      chapter: 3,
      startVerse: 16,
      endVerse: 18,
      reference: 'John 3:16–18',
    },
    ...overrides,
  }
}

const DEFAULT_FILTER: ActivityFilter = { type: 'all', book: 'all', color: 'all', searchQuery: '' }

describe('activityLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAllHighlights.mockReturnValue([])
    mockGetAllBookmarks.mockReturnValue([])
    mockGetAllNotes.mockReturnValue([])
    mockGetAllJournalEntries.mockReturnValue([])
    mockGetMeditationHistory.mockReturnValue([])
  })

  describe('loadAllActivity', () => {
    it('returns empty array when all stores empty', () => {
      expect(loadAllActivity()).toEqual([])
    })

    it('wraps highlights correctly', () => {
      mockGetAllHighlights.mockReturnValue([makeHighlight()])
      const items = loadAllActivity()
      expect(items).toHaveLength(1)
      expect(items[0].type).toBe('highlight')
      expect(items[0].id).toBe('hl-1')
      expect(items[0].book).toBe('john')
      expect(items[0].bookName).toBe('John')
      expect(items[0].chapter).toBe(3)
      expect(items[0].startVerse).toBe(16)
      expect(items[0].endVerse).toBe(16)
      expect(items[0].data).toEqual({ type: 'highlight', color: 'joy' })
    })

    it('wraps bookmarks correctly', () => {
      mockGetAllBookmarks.mockReturnValue([makeBookmark({ label: 'Favorite' })])
      const items = loadAllActivity()
      expect(items).toHaveLength(1)
      expect(items[0].type).toBe('bookmark')
      expect(items[0].data).toEqual({ type: 'bookmark', label: 'Favorite' })
      expect(items[0].updatedAt).toBe(items[0].createdAt)
    })

    it('wraps notes correctly', () => {
      mockGetAllNotes.mockReturnValue([makeNote()])
      const items = loadAllActivity()
      expect(items).toHaveLength(1)
      expect(items[0].type).toBe('note')
      expect(items[0].data).toEqual({ type: 'note', body: 'My note' })
    })

    it('includes meditation with verseContext', () => {
      mockGetMeditationHistory.mockReturnValue([makeMeditationSession()])
      const items = loadAllActivity()
      expect(items).toHaveLength(1)
      expect(items[0].type).toBe('meditation')
      expect(items[0].data).toEqual({
        type: 'meditation',
        meditationType: 'soaking',
        durationMinutes: 10,
        reference: 'John 3:16–18',
      })
    })

    it('excludes meditation without verseContext', () => {
      mockGetMeditationHistory.mockReturnValue([
        makeMeditationSession({ verseContext: undefined }),
      ])
      const items = loadAllActivity()
      expect(items).toHaveLength(0)
    })

    it('includes journal entries with verseContext', () => {
      mockGetAllJournalEntries.mockReturnValue([makeJournalEntry()])
      const items = loadAllActivity()
      expect(items).toHaveLength(1)
      expect(items[0].type).toBe('journal')
      expect(items[0].data).toEqual({
        type: 'journal',
        body: 'My journal reflection',
        reference: 'John 3:16–18',
      })
    })

    it('excludes journal entries without verseContext', () => {
      mockGetAllJournalEntries.mockReturnValue([
        makeJournalEntry({ verseContext: undefined }),
      ])
      const items = loadAllActivity()
      expect(items).toHaveLength(0)
    })

    it('merges all types', () => {
      mockGetAllHighlights.mockReturnValue([makeHighlight()])
      mockGetAllBookmarks.mockReturnValue([makeBookmark()])
      mockGetAllNotes.mockReturnValue([makeNote()])
      mockGetAllJournalEntries.mockReturnValue([makeJournalEntry()])
      mockGetMeditationHistory.mockReturnValue([makeMeditationSession()])
      const items = loadAllActivity()
      expect(items).toHaveLength(5)
      const types = items.map((i) => i.type)
      expect(types).toContain('highlight')
      expect(types).toContain('bookmark')
      expect(types).toContain('note')
      expect(types).toContain('meditation')
      expect(types).toContain('journal')
    })
  })

  describe('filterActivity', () => {
    function makeItems(): ActivityItem[] {
      mockGetAllHighlights.mockReturnValue([
        makeHighlight({ id: 'hl-1', color: 'joy' }),
        makeHighlight({ id: 'hl-2', color: 'peace', book: 'genesis', chapter: 1, startVerse: 1, endVerse: 1 }),
        makeHighlight({ id: 'hl-3', color: 'struggle' }),
      ])
      mockGetAllBookmarks.mockReturnValue([makeBookmark({ id: 'bm-1' })])
      mockGetAllNotes.mockReturnValue([makeNote({ id: 'note-1', book: 'genesis', chapter: 1, startVerse: 1, endVerse: 1 })])
      mockGetAllJournalEntries.mockReturnValue([makeJournalEntry({ id: 'journal-1' })])
      mockGetMeditationHistory.mockReturnValue([makeMeditationSession({ id: 'med-1' })])
      return loadAllActivity()
    }

    it('returns all items with default filter', () => {
      const items = makeItems()
      expect(filterActivity(items, DEFAULT_FILTER)).toHaveLength(7)
    })

    it('filters by type=highlights', () => {
      const items = makeItems()
      const filtered = filterActivity(items, { ...DEFAULT_FILTER, type: 'highlights' })
      expect(filtered.every((i) => i.type === 'highlight')).toBe(true)
      expect(filtered).toHaveLength(3)
    })

    it('filters by type=bookmarks', () => {
      const items = makeItems()
      const filtered = filterActivity(items, { ...DEFAULT_FILTER, type: 'bookmarks' })
      expect(filtered.every((i) => i.type === 'bookmark')).toBe(true)
      expect(filtered).toHaveLength(1)
    })

    it('filters by type=notes', () => {
      const items = makeItems()
      const filtered = filterActivity(items, { ...DEFAULT_FILTER, type: 'notes' })
      expect(filtered.every((i) => i.type === 'note')).toBe(true)
      expect(filtered).toHaveLength(1)
    })

    it('filters by type=daily-hub matches both meditation and journal', () => {
      const items = makeItems()
      const filtered = filterActivity(items, { ...DEFAULT_FILTER, type: 'daily-hub' })
      expect(filtered.every((i) => i.type === 'meditation' || i.type === 'journal')).toBe(true)
      expect(filtered).toHaveLength(2)
    })

    it('filters by book', () => {
      const items = makeItems()
      const filtered = filterActivity(items, { ...DEFAULT_FILTER, book: 'genesis' })
      expect(filtered.every((i) => i.book === 'genesis')).toBe(true)
      expect(filtered).toHaveLength(2)
    })

    it('filters by color', () => {
      const items = makeItems()
      const filtered = filterActivity(items, { type: 'highlights', book: 'all', color: 'joy', searchQuery: '' })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].data.type).toBe('highlight')
      if (filtered[0].data.type === 'highlight') {
        expect(filtered[0].data.color).toBe('joy')
      }
    })

    it('combines type and book filters', () => {
      const items = makeItems()
      const filtered = filterActivity(items, { type: 'highlights', book: 'genesis', color: 'all', searchQuery: '' })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].type).toBe('highlight')
      expect(filtered[0].book).toBe('genesis')
    })
    it('filters items by searchQuery', () => {
      const items: ActivityItem[] = [
        { type: 'note', id: '1', createdAt: 1000, updatedAt: 1000, book: 'john', bookName: 'John', chapter: 3, startVerse: 16, endVerse: 16, data: { type: 'note', body: 'feeling joyful today' } },
        { type: 'note', id: '2', createdAt: 2000, updatedAt: 2000, book: 'john', bookName: 'John', chapter: 3, startVerse: 17, endVerse: 17, data: { type: 'note', body: 'anxious but hopeful' } },
      ]
      const filtered = filterActivity(items, { ...DEFAULT_FILTER, searchQuery: 'joyful' })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('1')
    })

    it('empty searchQuery returns all items', () => {
      const items: ActivityItem[] = [
        { type: 'note', id: '1', createdAt: 1000, updatedAt: 1000, book: 'john', bookName: 'John', chapter: 3, startVerse: 16, endVerse: 16, data: { type: 'note', body: 'note a' } },
        { type: 'note', id: '2', createdAt: 2000, updatedAt: 2000, book: 'john', bookName: 'John', chapter: 3, startVerse: 17, endVerse: 17, data: { type: 'note', body: 'note b' } },
      ]
      const filtered = filterActivity(items, { ...DEFAULT_FILTER, searchQuery: '' })
      expect(filtered).toHaveLength(2)
    })

    it('composes search with type filter', () => {
      const items: ActivityItem[] = [
        { type: 'note', id: '1', createdAt: 1000, updatedAt: 1000, book: 'john', bookName: 'John', chapter: 3, startVerse: 16, endVerse: 16, data: { type: 'note', body: 'anxious today' } },
        { type: 'highlight', id: '2', createdAt: 2000, updatedAt: 2000, book: 'john', bookName: 'John', chapter: 3, startVerse: 17, endVerse: 17, data: { type: 'highlight', color: 'joy' } },
      ]
      const filtered = filterActivity(items, { type: 'notes', book: 'all', color: 'all', searchQuery: 'anxious' })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].type).toBe('note')
    })

    it('uses getVerseText in search when provided', () => {
      const items: ActivityItem[] = [
        { type: 'highlight', id: '1', createdAt: 1000, updatedAt: 1000, book: 'john', bookName: 'John', chapter: 3, startVerse: 16, endVerse: 16, data: { type: 'highlight', color: 'joy' } },
      ]
      const getVT = () => 'For God so loved the world'
      const filtered = filterActivity(items, { ...DEFAULT_FILTER, searchQuery: 'loved' }, getVT)
      expect(filtered).toHaveLength(1)
    })

    it('search works without getVerseText', () => {
      const items: ActivityItem[] = [
        { type: 'note', id: '1', createdAt: 1000, updatedAt: 1000, book: 'john', bookName: 'John', chapter: 3, startVerse: 16, endVerse: 16, data: { type: 'note', body: 'finding peace' } },
      ]
      const filtered = filterActivity(items, { ...DEFAULT_FILTER, searchQuery: 'peace' })
      expect(filtered).toHaveLength(1)
    })

    it('DEFAULT_FILTER includes searchQuery empty string', () => {
      expect(DEFAULT_FILTER.searchQuery).toBe('')
    })
  })

  describe('sortActivity', () => {
    it('recent puts newest first', () => {
      const items: ActivityItem[] = [
        { type: 'highlight', id: '1', createdAt: 1000, updatedAt: 1000, book: 'john', bookName: 'John', chapter: 3, startVerse: 16, endVerse: 16, data: { type: 'highlight', color: 'joy' } },
        { type: 'highlight', id: '2', createdAt: 3000, updatedAt: 3000, book: 'john', bookName: 'John', chapter: 3, startVerse: 17, endVerse: 17, data: { type: 'highlight', color: 'peace' } },
        { type: 'highlight', id: '3', createdAt: 2000, updatedAt: 2000, book: 'john', bookName: 'John', chapter: 3, startVerse: 18, endVerse: 18, data: { type: 'highlight', color: 'promise' } },
      ]
      const sorted = sortActivity(items, 'recent')
      expect(sorted.map((i) => i.id)).toEqual(['2', '3', '1'])
    })

    it('recent uses max(createdAt, updatedAt)', () => {
      const items: ActivityItem[] = [
        { type: 'note', id: '1', createdAt: 1000, updatedAt: 5000, book: 'john', bookName: 'John', chapter: 3, startVerse: 16, endVerse: 16, data: { type: 'note', body: 'a' } },
        { type: 'note', id: '2', createdAt: 4000, updatedAt: 4000, book: 'john', bookName: 'John', chapter: 3, startVerse: 17, endVerse: 17, data: { type: 'note', body: 'b' } },
      ]
      const sorted = sortActivity(items, 'recent')
      expect(sorted[0].id).toBe('1')
    })

    it('canonical orders Genesis before Exodus', () => {
      const items: ActivityItem[] = [
        { type: 'highlight', id: '1', createdAt: 1000, updatedAt: 1000, book: 'exodus', bookName: 'Exodus', chapter: 1, startVerse: 1, endVerse: 1, data: { type: 'highlight', color: 'joy' } },
        { type: 'highlight', id: '2', createdAt: 2000, updatedAt: 2000, book: 'genesis', bookName: 'Genesis', chapter: 1, startVerse: 1, endVerse: 1, data: { type: 'highlight', color: 'peace' } },
      ]
      const sorted = sortActivity(items, 'canonical')
      expect(sorted[0].book).toBe('genesis')
      expect(sorted[1].book).toBe('exodus')
    })

    it('canonical orders chapter then verse within same book', () => {
      const items: ActivityItem[] = [
        { type: 'highlight', id: '1', createdAt: 1000, updatedAt: 1000, book: 'john', bookName: 'John', chapter: 3, startVerse: 20, endVerse: 20, data: { type: 'highlight', color: 'joy' } },
        { type: 'highlight', id: '2', createdAt: 2000, updatedAt: 2000, book: 'john', bookName: 'John', chapter: 3, startVerse: 16, endVerse: 16, data: { type: 'highlight', color: 'peace' } },
        { type: 'highlight', id: '3', createdAt: 3000, updatedAt: 3000, book: 'john', bookName: 'John', chapter: 1, startVerse: 1, endVerse: 1, data: { type: 'highlight', color: 'promise' } },
      ]
      const sorted = sortActivity(items, 'canonical')
      expect(sorted.map((i) => i.id)).toEqual(['3', '2', '1'])
    })
  })
})
