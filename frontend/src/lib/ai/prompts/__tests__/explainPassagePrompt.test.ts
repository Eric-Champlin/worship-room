import { describe, expect, it } from 'vitest'
import {
  EXPLAIN_PASSAGE_SYSTEM_PROMPT,
  buildExplainPassageUserPrompt,
} from '../explainPassagePrompt'

describe('EXPLAIN_PASSAGE_SYSTEM_PROMPT', () => {
  it('is a non-empty string longer than 500 characters', () => {
    expect(typeof EXPLAIN_PASSAGE_SYSTEM_PROMPT).toBe('string')
    expect(EXPLAIN_PASSAGE_SYSTEM_PROMPT.length).toBeGreaterThan(500)
  })

  it('establishes the scholar-not-pastor voice', () => {
    expect(EXPLAIN_PASSAGE_SYSTEM_PROMPT).toContain('thoughtful biblical scholar')
    expect(EXPLAIN_PASSAGE_SYSTEM_PROMPT).toContain('You are not a pastor')
  })

  it('contains the forbidden-phrase list (rule 9)', () => {
    expect(EXPLAIN_PASSAGE_SYSTEM_PROMPT).toContain('God wants you to')
    expect(EXPLAIN_PASSAGE_SYSTEM_PROMPT).toContain('God is telling you')
    expect(EXPLAIN_PASSAGE_SYSTEM_PROMPT).toContain(
      'the Lord is saying to your heart',
    )
    expect(EXPLAIN_PASSAGE_SYSTEM_PROMPT).toContain('God is calling you to')
  })

  it('contains rule 4 (no application/prescription)', () => {
    expect(EXPLAIN_PASSAGE_SYSTEM_PROMPT).toContain('Do not prescribe application')
    expect(EXPLAIN_PASSAGE_SYSTEM_PROMPT).toContain(
      'Do not end with "so what does this mean for you"',
    )
  })

  it('contains rule 7 (hard passages honestly)', () => {
    expect(EXPLAIN_PASSAGE_SYSTEM_PROMPT).toContain('Acknowledge hard passages')
  })

  it('contains the 200-400 word length constraint (rule 8)', () => {
    expect(EXPLAIN_PASSAGE_SYSTEM_PROMPT).toContain('200-400 words')
  })

  it('contains rule 10 (no prayer/church/study recommendations)', () => {
    expect(EXPLAIN_PASSAGE_SYSTEM_PROMPT).toContain(
      'Never recommend prayer, church attendance',
    )
  })

  it('ends with the "explanation text only" instruction', () => {
    expect(EXPLAIN_PASSAGE_SYSTEM_PROMPT.trim().endsWith('Just the explanation.')).toBe(
      true,
    )
  })
})

describe('buildExplainPassageUserPrompt', () => {
  const REFERENCE = '1 Corinthians 13:4-7'
  const VERSE_TEXT =
    'Love is patient and is kind; love doesn\'t envy. Love doesn\'t brag, is not proud.'

  it('interpolates the reference', () => {
    const prompt = buildExplainPassageUserPrompt(REFERENCE, VERSE_TEXT)
    expect(prompt).toContain(REFERENCE)
  })

  it('interpolates the verse text verbatim', () => {
    const prompt = buildExplainPassageUserPrompt(REFERENCE, VERSE_TEXT)
    expect(prompt).toContain(VERSE_TEXT)
  })

  it('starts with the stable prefix', () => {
    const prompt = buildExplainPassageUserPrompt(REFERENCE, VERSE_TEXT)
    expect(prompt.startsWith('Explain this passage from the World English Bible:')).toBe(
      true,
    )
  })

  it('ends with the stable suffix question sentence', () => {
    const prompt = buildExplainPassageUserPrompt(REFERENCE, VERSE_TEXT)
    expect(
      prompt.trim().endsWith(
        'Give me the context, what the passage is doing in its own setting, and any interpretive difficulties an honest reader should know about.',
      ),
    ).toBe(true)
  })

  it('does not contain the system prompt text', () => {
    const prompt = buildExplainPassageUserPrompt(REFERENCE, VERSE_TEXT)
    expect(prompt).not.toContain('You are a thoughtful biblical scholar')
  })
})
