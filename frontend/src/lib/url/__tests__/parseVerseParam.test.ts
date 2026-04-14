import { describe, expect, it } from 'vitest'
import { parseVerseParam, formatVerseRange } from '../parseVerseParam'

describe('parseVerseParam', () => {
  // ---------------------------------------------------------------------------
  // Null / empty
  // ---------------------------------------------------------------------------

  it('returns null for null input', () => {
    expect(parseVerseParam(null)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseVerseParam('')).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // Single verse
  // ---------------------------------------------------------------------------

  it('parses a single verse', () => {
    expect(parseVerseParam('16')).toEqual({ start: 16, end: 16 })
  })

  it('parses a single-digit verse', () => {
    expect(parseVerseParam('1')).toEqual({ start: 1, end: 1 })
  })

  it('parses a three-digit verse', () => {
    expect(parseVerseParam('150')).toEqual({ start: 150, end: 150 })
  })

  // ---------------------------------------------------------------------------
  // Ranges
  // ---------------------------------------------------------------------------

  it('parses a valid range', () => {
    expect(parseVerseParam('16-18')).toEqual({ start: 16, end: 18 })
  })

  it('parses a same-start-end range', () => {
    expect(parseVerseParam('5-5')).toEqual({ start: 5, end: 5 })
  })

  it('parses a multi-digit range', () => {
    expect(parseVerseParam('100-150')).toEqual({ start: 100, end: 150 })
  })

  // ---------------------------------------------------------------------------
  // Invalid inputs → null
  // ---------------------------------------------------------------------------

  it('returns null for reversed range', () => {
    expect(parseVerseParam('5-3')).toBeNull()
  })

  it('returns null for non-contiguous comma list', () => {
    expect(parseVerseParam('16,18,20')).toBeNull()
  })

  it('returns null for non-numeric', () => {
    expect(parseVerseParam('abc')).toBeNull()
  })

  it('returns null for zero', () => {
    expect(parseVerseParam('0')).toBeNull()
  })

  it('returns null for zero-range start', () => {
    expect(parseVerseParam('0-5')).toBeNull()
  })

  it('returns null for negative number (leading dash)', () => {
    expect(parseVerseParam('-5')).toBeNull()
  })

  it('returns null for decimal', () => {
    expect(parseVerseParam('16.5')).toBeNull()
  })

  it('returns null for whitespace-padded value', () => {
    expect(parseVerseParam(' 16 ')).toBeNull()
  })

  it('returns null for trailing dash', () => {
    expect(parseVerseParam('16-')).toBeNull()
  })

  it('returns null for leading dash with range', () => {
    expect(parseVerseParam('-5-10')).toBeNull()
  })

  it('returns null for empty range', () => {
    expect(parseVerseParam('-')).toBeNull()
  })

  it('returns null for triple-dash', () => {
    expect(parseVerseParam('1-2-3')).toBeNull()
  })

  it('returns null for trailing letters on single verse', () => {
    expect(parseVerseParam('16x')).toBeNull()
  })

  it('returns null for trailing letters on range', () => {
    expect(parseVerseParam('16-18x')).toBeNull()
  })
})

describe('formatVerseRange', () => {
  it('formats a single verse without a dash', () => {
    expect(formatVerseRange({ start: 16, end: 16 })).toBe('16')
  })

  it('formats a range with a dash', () => {
    expect(formatVerseRange({ start: 16, end: 18 })).toBe('16-18')
  })

  it('round-trips through parseVerseParam', () => {
    const range = { start: 3, end: 7 }
    const parsed = parseVerseParam(formatVerseRange(range))
    expect(parsed).toEqual(range)
  })

  it('round-trips a single-verse range', () => {
    const range = { start: 42, end: 42 }
    const parsed = parseVerseParam(formatVerseRange(range))
    expect(parsed).toEqual(range)
  })
})
