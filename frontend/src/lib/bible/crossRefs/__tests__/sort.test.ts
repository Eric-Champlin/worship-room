import { describe, expect, it } from 'vitest'
import type { CrossRef } from '@/types/bible'
import { sortByCanonicalOrder, sortByStrength } from '../sort'

function makeCrossRef(overrides: Partial<CrossRef> & { ref: string; rank: number }): CrossRef {
  const parsed = overrides.parsed ?? { book: 'genesis', chapter: 1, verse: 1 }
  return {
    ref: overrides.ref,
    rank: overrides.rank,
    parsed,
  }
}

describe('sortByStrength', () => {
  it('sorts rank 1 before rank 2 before rank 3', () => {
    const refs = [
      makeCrossRef({ ref: 'a', rank: 3, parsed: { book: 'genesis', chapter: 1, verse: 1 } }),
      makeCrossRef({ ref: 'b', rank: 1, parsed: { book: 'genesis', chapter: 1, verse: 2 } }),
      makeCrossRef({ ref: 'c', rank: 2, parsed: { book: 'genesis', chapter: 1, verse: 3 } }),
    ]

    const sorted = sortByStrength(refs)
    expect(sorted.map((r) => r.rank)).toEqual([1, 2, 3])
  })

  it('is stable within equal ranks (preserves insertion order)', () => {
    const refs = [
      makeCrossRef({ ref: 'first', rank: 1, parsed: { book: 'genesis', chapter: 1, verse: 1 } }),
      makeCrossRef({ ref: 'second', rank: 1, parsed: { book: 'genesis', chapter: 1, verse: 2 } }),
      makeCrossRef({ ref: 'third', rank: 1, parsed: { book: 'genesis', chapter: 1, verse: 3 } }),
    ]

    const sorted = sortByStrength(refs)
    expect(sorted.map((r) => r.ref)).toEqual(['first', 'second', 'third'])
  })

  it('returns empty array for empty input', () => {
    expect(sortByStrength([])).toEqual([])
  })

  it('does not mutate the original array', () => {
    const refs = [
      makeCrossRef({ ref: 'a', rank: 3, parsed: { book: 'genesis', chapter: 1, verse: 1 } }),
      makeCrossRef({ ref: 'b', rank: 1, parsed: { book: 'genesis', chapter: 1, verse: 2 } }),
    ]
    const original = [...refs]

    sortByStrength(refs)
    expect(refs.map((r) => r.ref)).toEqual(original.map((r) => r.ref))
  })
})

describe('sortByCanonicalOrder', () => {
  it('sorts Genesis before Exodus before Revelation', () => {
    const refs = [
      makeCrossRef({ ref: 'c', rank: 1, parsed: { book: 'revelation', chapter: 1, verse: 1 } }),
      makeCrossRef({ ref: 'a', rank: 1, parsed: { book: 'genesis', chapter: 1, verse: 1 } }),
      makeCrossRef({ ref: 'b', rank: 1, parsed: { book: 'exodus', chapter: 1, verse: 1 } }),
    ]

    const sorted = sortByCanonicalOrder(refs)
    expect(sorted.map((r) => r.parsed.book)).toEqual(['genesis', 'exodus', 'revelation'])
  })

  it('sorts same book by chapter', () => {
    const refs = [
      makeCrossRef({ ref: 'b', rank: 1, parsed: { book: 'john', chapter: 5, verse: 1 } }),
      makeCrossRef({ ref: 'a', rank: 1, parsed: { book: 'john', chapter: 1, verse: 1 } }),
    ]

    const sorted = sortByCanonicalOrder(refs)
    expect(sorted.map((r) => r.parsed.chapter)).toEqual([1, 5])
  })

  it('sorts same book+chapter by verse', () => {
    const refs = [
      makeCrossRef({ ref: 'b', rank: 1, parsed: { book: 'john', chapter: 3, verse: 18 } }),
      makeCrossRef({ ref: 'a', rank: 1, parsed: { book: 'john', chapter: 3, verse: 16 } }),
    ]

    const sorted = sortByCanonicalOrder(refs)
    expect(sorted.map((r) => r.parsed.verse)).toEqual([16, 18])
  })

  it('orders OT before NT (cross-testament ordering)', () => {
    const refs = [
      makeCrossRef({ ref: 'b', rank: 1, parsed: { book: 'romans', chapter: 1, verse: 1 } }),
      makeCrossRef({ ref: 'a', rank: 1, parsed: { book: 'isaiah', chapter: 1, verse: 1 } }),
    ]

    const sorted = sortByCanonicalOrder(refs)
    expect(sorted.map((r) => r.parsed.book)).toEqual(['isaiah', 'romans'])
  })
})
