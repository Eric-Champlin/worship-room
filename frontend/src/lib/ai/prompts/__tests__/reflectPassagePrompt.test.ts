import { describe, expect, it } from 'vitest'
import {
  REFLECT_PASSAGE_SYSTEM_PROMPT,
  buildReflectPassageUserPrompt,
} from '../reflectPassagePrompt'

describe('REFLECT_PASSAGE_SYSTEM_PROMPT', () => {
  it('is a non-empty string longer than 500 characters', () => {
    expect(typeof REFLECT_PASSAGE_SYSTEM_PROMPT).toBe('string')
    expect(REFLECT_PASSAGE_SYSTEM_PROMPT.length).toBeGreaterThan(500)
  })

  it('requires interrogative and conditional mood (rule 1)', () => {
    expect(REFLECT_PASSAGE_SYSTEM_PROMPT).toContain(
      'interrogative and conditional mood',
    )
  })

  it('forbids "this passage teaches" declarative phrasing (rule 1 bad examples)', () => {
    expect(REFLECT_PASSAGE_SYSTEM_PROMPT).toContain('This passage teaches us that')
  })

  it('requires multiple possibilities (rule 2)', () => {
    expect(REFLECT_PASSAGE_SYSTEM_PROMPT).toContain('Offer multiple possibilities')
  })

  it('requires the agency clause (rule 3)', () => {
    expect(REFLECT_PASSAGE_SYSTEM_PROMPT).toContain('might not land at all')
  })

  it('forbids prescribed practices (rule 5)', () => {
    expect(REFLECT_PASSAGE_SYSTEM_PROMPT).toContain('Do not prescribe practices')
  })

  it('forbids pastoral ventriloquism (rule 6)', () => {
    expect(REFLECT_PASSAGE_SYSTEM_PROMPT).toContain('Do not speak for God')
  })

  it('forbids the "life lesson" voice (rule 9)', () => {
    expect(REFLECT_PASSAGE_SYSTEM_PROMPT).toContain('so the next time you')
  })

  it('contains the 150-300 word length constraint (rule 8)', () => {
    expect(REFLECT_PASSAGE_SYSTEM_PROMPT).toContain('150-300 words')
  })

  it('ends with the "reflection text only" instruction', () => {
    expect(
      REFLECT_PASSAGE_SYSTEM_PROMPT.trim().endsWith('Just the reflection.'),
    ).toBe(true)
  })
})

describe('buildReflectPassageUserPrompt', () => {
  const REFERENCE = 'Philippians 4:6-7'
  const VERSE_TEXT =
    "In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God."

  it('interpolates the reference', () => {
    const prompt = buildReflectPassageUserPrompt(REFERENCE, VERSE_TEXT)
    expect(prompt).toContain(REFERENCE)
  })

  it('interpolates the verse text verbatim', () => {
    const prompt = buildReflectPassageUserPrompt(REFERENCE, VERSE_TEXT)
    expect(prompt).toContain(VERSE_TEXT)
  })

  it('starts with the stable prefix', () => {
    const prompt = buildReflectPassageUserPrompt(REFERENCE, VERSE_TEXT)
    expect(
      prompt.startsWith("I'm reading this passage from the World English Bible:"),
    ).toBe(true)
  })

  it('asks for genuine questions and possibilities', () => {
    const prompt = buildReflectPassageUserPrompt(REFERENCE, VERSE_TEXT)
    expect(prompt).toContain('genuine questions and possibilities')
  })

  it('handles empty args without throwing', () => {
    expect(() => buildReflectPassageUserPrompt('', '')).not.toThrow()
    expect(typeof buildReflectPassageUserPrompt('', '')).toBe('string')
  })

  it('does not contain the system prompt text', () => {
    const prompt = buildReflectPassageUserPrompt(REFERENCE, VERSE_TEXT)
    expect(prompt).not.toContain('You are helping a reader think about')
  })
})
