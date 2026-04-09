import { describe, expect, it } from 'vitest'
import { validateExport } from '../importValidator'
import type { BibleExportV1 } from '@/types/bible-export'

// --- Factory ---

function makeValidExport(overrides: Partial<BibleExportV1> = {}): BibleExportV1 {
  return {
    schemaVersion: 1,
    exportedAt: '2026-04-01T10:00:00.000Z',
    appVersion: 'worship-room-bible-wave-1',
    data: {
      highlights: [
        {
          id: 'h1',
          book: 'john',
          chapter: 3,
          startVerse: 16,
          endVerse: 16,
          color: 'peace',
          createdAt: 1712000000000,
          updatedAt: 1712000000000,
        },
      ],
      bookmarks: [
        {
          id: 'b1',
          book: 'psalms',
          chapter: 23,
          startVerse: 1,
          endVerse: 6,
          createdAt: 1712000000000,
        },
      ],
      notes: [
        {
          id: 'n1',
          book: 'romans',
          chapter: 8,
          startVerse: 28,
          endVerse: 28,
          body: 'All things work together',
          createdAt: 1712000000000,
          updatedAt: 1712000000000,
        },
      ],
      prayers: [
        {
          id: 'p1',
          title: 'Guidance',
          description: 'Guide me',
          createdAt: '2026-04-01T10:00:00.000Z',
          updatedAt: '2026-04-01T10:00:00.000Z',
        },
      ],
      journals: [
        {
          id: 'j1',
          body: 'Today I reflected on grace.',
          createdAt: 1712000000000,
          updatedAt: 1712000000000,
        },
      ],
      meditations: [
        {
          id: 'm1',
          type: 'breathing',
          date: '2026-04-01',
          durationMinutes: 5,
          completedAt: '2026-04-01T10:05:00.000Z',
        },
      ],
    },
    ...overrides,
  }
}

const ERROR_INVALID = "This file isn't a valid Worship Room export. It might be corrupted or from a different app."
const ERROR_NEWER_VERSION = 'This export was made with a newer version of Worship Room. Update the app to import it.'
const ERROR_MISSING_DATA = 'This export is missing required data. It might be corrupted.'

describe('validateExport', () => {
  // --- Happy path ---

  it('returns valid for a correct v1 export', () => {
    const input = makeValidExport()
    const result = validateExport(input)
    expect(result).toEqual({ valid: true, export: input })
  })

  // --- Non-object inputs ---

  it('returns invalid for null', () => {
    const result = validateExport(null)
    expect(result).toEqual({ valid: false, error: ERROR_INVALID })
  })

  it('returns invalid for a string', () => {
    const result = validateExport('hello')
    expect(result).toEqual({ valid: false, error: ERROR_INVALID })
  })

  it('returns invalid for a number', () => {
    const result = validateExport(42)
    expect(result).toEqual({ valid: false, error: ERROR_INVALID })
  })

  it('returns invalid for an array', () => {
    const result = validateExport([1, 2, 3])
    expect(result).toEqual({ valid: false, error: ERROR_INVALID })
  })

  // --- Schema version errors ---

  it('returns invalid for missing schemaVersion', () => {
    const input = makeValidExport()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (input as any).schemaVersion
    const result = validateExport(input)
    expect(result).toEqual({ valid: false, error: ERROR_MISSING_DATA })
  })

  it('accepts schemaVersion 2 (current version)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input = makeValidExport({ schemaVersion: 2 as any })
    const result = validateExport(input)
    expect(result.valid).toBe(true)
  })

  it('returns newer version error for schemaVersion 3', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input = makeValidExport({ schemaVersion: 3 as any })
    const result = validateExport(input)
    expect(result).toEqual({ valid: false, error: ERROR_NEWER_VERSION })
  })

  it('returns invalid for schemaVersion 0', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input = makeValidExport({ schemaVersion: 0 as any })
    const result = validateExport(input)
    expect(result).toEqual({ valid: false, error: ERROR_MISSING_DATA })
  })

  it('returns invalid for non-integer schemaVersion (1.5)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input = makeValidExport({ schemaVersion: 1.5 as any })
    const result = validateExport(input)
    expect(result).toEqual({ valid: false, error: ERROR_MISSING_DATA })
  })

  // --- Missing envelope fields ---

  it('returns invalid for missing data field', () => {
    const input = makeValidExport()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (input as any).data
    const result = validateExport(input)
    expect(result).toEqual({ valid: false, error: ERROR_MISSING_DATA })
  })

  it('returns invalid for data that is not an object', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input = makeValidExport({ data: 'not-an-object' as any })
    const result = validateExport(input)
    expect(result).toEqual({ valid: false, error: ERROR_MISSING_DATA })
  })

  // --- Missing data keys ---

  it('returns invalid for missing highlights key', () => {
    const input = makeValidExport()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (input.data as any).highlights
    const result = validateExport(input)
    expect(result).toEqual({ valid: false, error: ERROR_MISSING_DATA })
  })

  it('returns invalid for data key that is not an array', () => {
    const input = makeValidExport()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(input.data as any).bookmarks = 'not-array'
    const result = validateExport(input)
    expect(result).toEqual({ valid: false, error: ERROR_MISSING_DATA })
  })

  // --- Per-record validation ---

  it('returns invalid for highlight missing id', () => {
    const input = makeValidExport()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (input.data.highlights[0] as any).id
    const result = validateExport(input)
    expect(result).toEqual({ valid: false, error: ERROR_MISSING_DATA })
  })

  it('returns invalid for highlight with chapter as float', () => {
    const input = makeValidExport()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(input.data.highlights[0] as any).chapter = 3.5
    const result = validateExport(input)
    expect(result).toEqual({ valid: false, error: ERROR_MISSING_DATA })
  })

  it('returns invalid for bookmark missing book', () => {
    const input = makeValidExport()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (input.data.bookmarks[0] as any).book
    const result = validateExport(input)
    expect(result).toEqual({ valid: false, error: ERROR_MISSING_DATA })
  })

  it('returns invalid for note missing body', () => {
    const input = makeValidExport()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (input.data.notes[0] as any).body
    const result = validateExport(input)
    expect(result).toEqual({ valid: false, error: ERROR_MISSING_DATA })
  })

  it('returns invalid for journal missing updatedAt', () => {
    const input = makeValidExport()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (input.data.journals[0] as any).updatedAt
    const result = validateExport(input)
    expect(result).toEqual({ valid: false, error: ERROR_MISSING_DATA })
  })

  it('returns invalid for prayer with non-string createdAt', () => {
    const input = makeValidExport()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(input.data.prayers[0] as any).createdAt = 1712000000000
    const result = validateExport(input)
    expect(result).toEqual({ valid: false, error: ERROR_MISSING_DATA })
  })

  it('returns invalid for meditation missing durationMinutes', () => {
    const input = makeValidExport()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (input.data.meditations[0] as any).durationMinutes
    const result = validateExport(input)
    expect(result).toEqual({ valid: false, error: ERROR_MISSING_DATA })
  })

  // --- Empty arrays are valid ---

  it('returns valid for all empty data arrays', () => {
    const input = makeValidExport({
      data: {
        highlights: [],
        bookmarks: [],
        notes: [],
        prayers: [],
        journals: [],
        meditations: [],
      },
    })
    const result = validateExport(input)
    expect(result).toEqual({ valid: true, export: input })
  })

  // --- Extra fields preserved ---

  it('preserves extra unknown fields on records', () => {
    const input = makeValidExport()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(input.data.highlights[0] as any).customField = 'preserved'
    const result = validateExport(input)
    expect(result.valid).toBe(true)
    if (result.valid) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result.export.data.highlights[0] as any).customField).toBe('preserved')
    }
  })

  it('preserves extra unknown fields on top-level object', () => {
    const input = makeValidExport()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(input as any).exportSource = 'desktop-app'
    const result = validateExport(input)
    expect(result.valid).toBe(true)
  })

  it('preserves all fields on valid records with extras', () => {
    const input = makeValidExport()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(input.data.notes[0] as any).tag = 'favorite'
    const result = validateExport(input)
    expect(result.valid).toBe(true)
    if (result.valid) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result.export.data.notes[0] as any).tag).toBe('favorite')
      expect(result.export.data.notes[0].body).toBe('All things work together')
    }
  })
})
