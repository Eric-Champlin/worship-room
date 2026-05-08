/**
 * Drift test contract (Phase 4.1, D5):
 *
 * If you change `EXPECTED_BACKEND_VALUES` in this file, update
 * backend/src/main/java/com/worshiproom/post/PostType.java to match.
 * BOTH MUST CHANGE IN THE SAME COMMIT. The drift test below is the only
 * mechanism guarding sync between frontend and backend post-type strings
 * (the OpenAPI spec at backend/src/main/resources/openapi.yaml also
 * declares the enum at lines ~1496/3455/3548 and must be hand-synced
 * separately until a codegen pipeline ships).
 */
import { describe, it, expect } from 'vitest'
import {
  POST_TYPES,
  isValidPostType,
  getPostType,
  type PostType,
} from '../post-types'

const EXPECTED_BACKEND_VALUES = [
  'prayer_request',
  'testimony',
  'question',
  'discussion',
  'encouragement',
] as const

describe('post-types — shape', () => {
  it('POST_TYPES has 5 entries', () => {
    expect(POST_TYPES).toHaveLength(5)
  })

  it('every entry has id, label, pluralLabel, icon, description, enabled', () => {
    for (const entry of POST_TYPES) {
      expect(typeof entry.id).toBe('string')
      expect(typeof entry.label).toBe('string')
      expect(typeof entry.pluralLabel).toBe('string')
      expect(typeof entry.icon).toBe('string')
      expect(typeof entry.description).toBe('string')
      expect(typeof entry.enabled).toBe('boolean')
    }
  })
})

describe('post-types — backend drift', () => {
  it('POST_TYPES ids match backend Java enum exactly (drift test)', () => {
    const ids = POST_TYPES.map((t) => t.id)
    expect(ids).toEqual(EXPECTED_BACKEND_VALUES)
  })
})

describe('post-types — feature flags', () => {
  it('prayer_request is enabled', () => {
    expect(getPostType('prayer_request').enabled).toBe(true)
  })

  it('testimony, question, discussion, encouragement are disabled', () => {
    expect(getPostType('testimony').enabled).toBe(false)
    expect(getPostType('question').enabled).toBe(false)
    expect(getPostType('discussion').enabled).toBe(false)
    expect(getPostType('encouragement').enabled).toBe(false)
  })
})

describe('post-types — isValidPostType', () => {
  it('returns true for each valid id', () => {
    for (const id of EXPECTED_BACKEND_VALUES) {
      expect(isValidPostType(id)).toBe(true)
    }
  })

  it('returns false for null, empty, unknown, and uppercase variants', () => {
    expect(isValidPostType(null)).toBe(false)
    expect(isValidPostType('')).toBe(false)
    expect(isValidPostType('PRAYER_REQUEST')).toBe(false)
    expect(isValidPostType('comment')).toBe(false)
  })
})

describe('post-types — getPostType lookup', () => {
  it('returns the entry for a valid id', () => {
    const entry = getPostType('prayer_request')
    expect(entry.id).toBe('prayer_request')
    expect(entry.label).toBe('Prayer request')
  })

  it('throws with descriptive error on unknown id', () => {
    expect(() => getPostType('nonsense' as PostType)).toThrowError(
      /Unknown post type id: nonsense/,
    )
  })
})

describe('post-types — brand voice', () => {
  it('no description contains an exclamation point', () => {
    for (const entry of POST_TYPES) {
      expect(entry.description).not.toMatch(/!/)
    }
  })

  it('every description ends with a period', () => {
    for (const entry of POST_TYPES) {
      expect(entry.description.endsWith('.')).toBe(true)
    }
  })

  it('no description contains urgency words', () => {
    const urgencyWords = /\b(now|today|hurry|quick|don'?t miss|asap|urgent)\b/i
    for (const entry of POST_TYPES) {
      expect(entry.description).not.toMatch(urgencyWords)
    }
  })

  it('every pluralLabel ends with "s" (basic plural heuristic)', () => {
    for (const entry of POST_TYPES) {
      expect(entry.pluralLabel.endsWith('s')).toBe(true)
    }
  })
})
