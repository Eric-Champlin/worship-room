import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Highlight, Bookmark, Note, JournalEntry } from '@/types/bible'
import type { PersonalPrayer } from '@/types/personal-prayer'
import type { MeditationSession } from '@/types/meditation'
import type { MergeResult } from '@/types/bible-export'

// --- Factories ---

function makeHighlight(overrides: Partial<Highlight> = {}): Highlight {
  return {
    id: 'h1',
    book: 'john',
    chapter: 3,
    startVerse: 16,
    endVerse: 16,
    color: 'peace',
    createdAt: 1000,
    updatedAt: 1000,
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
    createdAt: 1000,
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
    body: 'All things work together',
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  }
}

function makeJournal(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: 'j1',
    body: 'Reflected on grace.',
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  }
}

function makePrayer(overrides: Partial<PersonalPrayer> = {}): PersonalPrayer {
  return {
    id: 'p1',
    title: 'Guidance',
    description: 'Guide me',
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

// --- Reactive store tests (dynamic import for fresh module state) ---

describe('highlightStore mutations', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  async function loadStore() {
    return import('@/lib/bible/highlightStore')
  }

  it('replaceAllHighlights writes and notifies', async () => {
    const store = await loadStore()
    const listener = vi.fn()
    store.subscribe(listener)

    const records = [makeHighlight({ id: 'h1' }), makeHighlight({ id: 'h2' })]
    store.replaceAllHighlights(records)

    expect(store.getAllHighlights()).toEqual(records)
    expect(listener).toHaveBeenCalled()
  })

  it('replaceAllHighlights with empty array clears store', async () => {
    const store = await loadStore()
    store.replaceAllHighlights([makeHighlight()])
    store.replaceAllHighlights([])
    expect(store.getAllHighlights()).toEqual([])
  })

  it('mergeInHighlights adds new records', async () => {
    const store = await loadStore()
    const result = store.mergeInHighlights([makeHighlight({ id: 'h-new' })])
    expect(result).toEqual({ added: 1, updated: 0, skipped: 0 })
    expect(store.getAllHighlights()).toHaveLength(1)
  })

  it('mergeInHighlights updates newer records', async () => {
    const store = await loadStore()
    store.replaceAllHighlights([makeHighlight({ id: 'h1', updatedAt: 1000 })])
    const result = store.mergeInHighlights([makeHighlight({ id: 'h1', updatedAt: 2000, color: 'joy' })])
    expect(result).toEqual({ added: 0, updated: 1, skipped: 0 })
    expect(store.getAllHighlights()[0].color).toBe('joy')
  })

  it('mergeInHighlights skips older records', async () => {
    const store = await loadStore()
    store.replaceAllHighlights([makeHighlight({ id: 'h1', updatedAt: 2000 })])
    const result = store.mergeInHighlights([makeHighlight({ id: 'h1', updatedAt: 1000, color: 'joy' })])
    expect(result).toEqual({ added: 0, updated: 0, skipped: 1 })
    expect(store.getAllHighlights()[0].color).toBe('peace') // unchanged
  })

  it('mergeInHighlights returns correct counts', async () => {
    const store = await loadStore()
    store.replaceAllHighlights([
      makeHighlight({ id: 'h1', updatedAt: 1000 }),
      makeHighlight({ id: 'h2', updatedAt: 3000 }),
    ])
    const result = store.mergeInHighlights([
      makeHighlight({ id: 'h1', updatedAt: 2000 }), // updated
      makeHighlight({ id: 'h2', updatedAt: 1000 }), // skipped
      makeHighlight({ id: 'h3' }), // added
    ])
    expect(result).toEqual({ added: 1, updated: 1, skipped: 1 })
  })
})

describe('bookmarkStore mutations', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  async function loadStore() {
    return import('@/lib/bible/bookmarkStore')
  }

  it('replaceAllBookmarks writes and notifies', async () => {
    const store = await loadStore()
    const listener = vi.fn()
    store.subscribe(listener)

    const records = [makeBookmark({ id: 'b1' })]
    store.replaceAllBookmarks(records)

    expect(store.getAllBookmarks()).toEqual(records)
    expect(listener).toHaveBeenCalled()
  })

  it('mergeInBookmarks incoming wins on conflict', async () => {
    const store = await loadStore()
    store.replaceAllBookmarks([makeBookmark({ id: 'b1', book: 'psalms' })])
    const result = store.mergeInBookmarks([makeBookmark({ id: 'b1', book: 'genesis' })])
    expect(result).toEqual({ added: 0, updated: 1, skipped: 0 })
    expect(store.getAllBookmarks()[0].book).toBe('genesis')
  })
})

describe('noteStore mutations', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  async function loadStore() {
    return import('@/lib/bible/notes/store')
  }

  it('replaceAllNotes writes and notifies', async () => {
    const store = await loadStore()
    const listener = vi.fn()
    store.subscribe(listener)

    store.replaceAllNotes([makeNote()])
    expect(store.getAllNotes()).toHaveLength(1)
    expect(listener).toHaveBeenCalled()
  })

  it('mergeInNotes respects updatedAt', async () => {
    const store = await loadStore()
    store.replaceAllNotes([makeNote({ id: 'n1', updatedAt: 1000 })])
    const result = store.mergeInNotes([makeNote({ id: 'n1', updatedAt: 2000, body: 'Updated' })])
    expect(result.updated).toBe(1)
    expect(store.getAllNotes()[0].body).toBe('Updated')
  })
})

describe('journalStore mutations', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  async function loadStore() {
    return import('@/lib/bible/journalStore')
  }

  it('replaceAllJournals writes and notifies', async () => {
    const store = await loadStore()
    const listener = vi.fn()
    store.subscribe(listener)

    store.replaceAllJournals([makeJournal()])
    expect(store.getAllJournalEntries()).toHaveLength(1)
    expect(listener).toHaveBeenCalled()
  })

  it('mergeInJournals respects updatedAt', async () => {
    const store = await loadStore()
    store.replaceAllJournals([makeJournal({ id: 'j1', updatedAt: 1000 })])
    const result = store.mergeInJournals([makeJournal({ id: 'j1', updatedAt: 2000, body: 'New body' })])
    expect(result.updated).toBe(1)
    expect(store.getAllJournalEntries()[0].body).toBe('New body')
  })
})

describe('prayer-list-storage mutations', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('replaceAllPrayers writes', async () => {
    const { replaceAllPrayers, getPrayers } = await import('@/services/prayer-list-storage')
    replaceAllPrayers([makePrayer()])
    expect(getPrayers()).toHaveLength(1)
  })

  it('mergeInPrayers compares ISO timestamps', async () => {
    const { replaceAllPrayers, mergeInPrayers, getPrayers } = await import('@/services/prayer-list-storage')
    replaceAllPrayers([makePrayer({ id: 'p1', updatedAt: '2026-04-01T10:00:00.000Z' })])
    const result = mergeInPrayers([makePrayer({ id: 'p1', updatedAt: '2026-04-02T10:00:00.000Z', title: 'Updated' })])
    expect(result.updated).toBe(1)
    expect(getPrayers()[0].title).toBe('Updated')
  })
})

describe('meditation-storage mutations', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('replaceAllMeditations writes', async () => {
    const { replaceAllMeditations, getMeditationHistory } = await import('@/services/meditation-storage')
    replaceAllMeditations([makeMeditation()])
    expect(getMeditationHistory()).toHaveLength(1)
  })

  it('mergeInMeditations incoming wins on conflict', async () => {
    const { replaceAllMeditations, mergeInMeditations, getMeditationHistory } = await import(
      '@/services/meditation-storage'
    )
    replaceAllMeditations([makeMeditation({ id: 'm1', durationMinutes: 5 })])
    const result = mergeInMeditations([makeMeditation({ id: 'm1', durationMinutes: 10 })])
    expect(result).toEqual({ added: 0, updated: 1, skipped: 0 })
    expect(getMeditationHistory()[0].durationMinutes).toBe(10)
  })
})
