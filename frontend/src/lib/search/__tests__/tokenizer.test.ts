import { describe, it, expect } from 'vitest'
import { tokenize, stem, STOPWORDS, tokenizeWithPositions } from '../tokenizer'

describe('STOPWORDS', () => {
  it('has 30 entries', () => {
    expect(STOPWORDS.size).toBe(30)
  })
})

describe('stem', () => {
  it('drops trailing s (prayers → prayer)', () => {
    expect(stem('prayers')).toBe('prayer')
  })

  it('drops trailing ed (called → call)', () => {
    expect(stem('called')).toBe('call')
  })

  it('does not stem "loved" because stem "lov" is only 3 chars', () => {
    expect(stem('loved')).toBe('loved')
  })

  it('drops trailing ing (praying → pray)', () => {
    expect(stem('praying')).toBe('pray')
  })

  it('drops trailing ness (darkness → dark)', () => {
    expect(stem('darkness')).toBe('dark')
  })

  it('drops trailing ly (boldly → bold)', () => {
    expect(stem('boldly')).toBe('bold')
  })

  it('enforces minimum 4-char stem (was → was)', () => {
    expect(stem('was')).toBe('was')
  })

  it('enforces minimum 4-char stem (led → led)', () => {
    expect(stem('led')).toBe('led')
  })

  it('does not strip ss (bless → bless)', () => {
    expect(stem('bless')).toBe('bless')
  })

  it('keeps "loving" because "lov" is only 3 chars', () => {
    expect(stem('loving')).toBe('loving')
  })

  it('stems "forgiveness" → "forgive" via ness rule', () => {
    expect(stem('forgiveness')).toBe('forgive')
  })

  it('stems "righteousness" → "righteous" via ness rule', () => {
    expect(stem('righteousness')).toBe('righteous')
  })

  it('stems "commanded" → "command" via ed rule', () => {
    expect(stem('commanded')).toBe('command')
  })

  it('stems "nations" → "nation" via s rule', () => {
    expect(stem('nations')).toBe('nation')
  })
})

describe('tokenize', () => {
  it('lowercases input', () => {
    const tokens = tokenize('GOD So LOVED')
    expect(tokens).toContain('god')
    // "loved" stays "loved" — stem("loved") = "lov" (3 chars < 4 min)
    expect(tokens).toContain('loved')
  })

  it('strips punctuation', () => {
    expect(tokenize('world.')).toEqual(['world'])
  })

  it("strips possessive apostrophe (Lord's → lord)", () => {
    const tokens = tokenize("Lord's")
    expect(tokens).toEqual(['lord'])
  })

  it("preserves internal apostrophes (don't stays don't)", () => {
    const tokens = tokenize("don't")
    expect(tokens).toEqual(["don't"])
  })

  it('removes stopwords', () => {
    const tokens = tokenize('the Lord is my shepherd')
    expect(tokens).not.toContain('the')
    expect(tokens).not.toContain('is')
    // "my" is not in the stopword list, so it stays if stemmed form ≥ 1 char
    expect(tokens).toContain('lord')
    expect(tokens).toContain('shepherd')
  })

  it('preserves numbers', () => {
    const tokens = tokenize('144,000 people')
    expect(tokens).toContain('144')
    expect(tokens).toContain('000')
    expect(tokens).toContain('people')
  })

  it('handles standalone numbers', () => {
    expect(tokenize('1000')).toEqual(['1000'])
  })

  it('handles empty input', () => {
    expect(tokenize('')).toEqual([])
  })

  it('handles all-stopwords input', () => {
    expect(tokenize('the and is')).toEqual([])
  })

  it('deduplicates tokens', () => {
    const tokens = tokenize('love love love')
    expect(tokens).toEqual(['love'])
  })

  it("tokenizes God's love → [god, love]", () => {
    const tokens = tokenize("God's love")
    expect(tokens).toEqual(['god', 'love'])
  })

  it('stems multiple words in a phrase', () => {
    const tokens = tokenize('prayers and praying')
    expect(tokens).toContain('prayer')
    expect(tokens).toContain('pray')
    expect(tokens).not.toContain('and')
  })

  it('handles verse-like text with verse numbers', () => {
    const tokens = tokenize('For God so loved the world')
    expect(tokens).toContain('god')
    expect(tokens).toContain('loved')
    expect(tokens).toContain('world')
    expect(tokens).not.toContain('for')
    expect(tokens).not.toContain('the')
  })
})

describe('tokenizeWithPositions', () => {
  it('returns tokens with their word positions', () => {
    const result = tokenizeWithPositions('God so loved the world')
    // "god" at 0, "so" at 1, "loved" at 2 (not stemmed — "lov" < 4 chars), "world" at 4
    // "the" is a stopword (filtered)
    const tokens = result.map(([t]) => t)
    expect(tokens).toContain('god')
    expect(tokens).toContain('loved')
    expect(tokens).toContain('world')
  })

  it('preserves position indices for proximity calculation', () => {
    const result = tokenizeWithPositions('For God so loved the world')
    // Positions: for=0, god=1, so=2, loved=3, the=4, world=5
    // After stopword removal: god=1, so=2, loved=3, world=5
    const godEntry = result.find(([t]) => t === 'god')
    const lovedEntry = result.find(([t]) => t === 'loved')
    const worldEntry = result.find(([t]) => t === 'world')
    expect(godEntry).toBeDefined()
    expect(lovedEntry).toBeDefined()
    expect(worldEntry).toBeDefined()
    expect(godEntry![1]).toBeLessThan(lovedEntry![1])
    expect(lovedEntry![1]).toBeLessThan(worldEntry![1])
  })
})
