import { describe, it, expect } from 'vitest'
import { getAskResponse, ASK_RESPONSES } from '@/mocks/ask-mock-data'

// All topic IDs including fallback
const ALL_TOPIC_IDS = [
  'suffering',
  'forgiveness',
  'anxiety',
  'purpose',
  'doubt',
  'prayer',
  'grief',
  'loneliness',
  'anger',
  'marriage',
  'parenting',
  'money',
  'identity',
  'temptation',
  'afterlife',
  'fallback',
] as const

describe('ASK_RESPONSES', () => {
  it('contains 16 responses (15 topics + fallback)', () => {
    expect(Object.keys(ASK_RESPONSES)).toHaveLength(16)
  })

  it.each(ALL_TOPIC_IDS)('response "%s" has 3 verses', (id) => {
    const response = ASK_RESPONSES[id]
    expect(response).toBeDefined()
    expect(response.verses).toHaveLength(3)
  })

  it.each(ALL_TOPIC_IDS)(
    'response "%s" has non-empty answer, encouragement, and prayer',
    (id) => {
      const response = ASK_RESPONSES[id]
      expect(response.answer.length).toBeGreaterThan(0)
      expect(response.encouragement.length).toBeGreaterThan(0)
      expect(response.prayer.length).toBeGreaterThan(0)
    }
  )

  it.each(ALL_TOPIC_IDS)('response "%s" has a valid id and topic', (id) => {
    const response = ASK_RESPONSES[id]
    expect(response.id).toBe(id)
    expect(response.topic.length).toBeGreaterThan(0)
  })

  it.each(ALL_TOPIC_IDS)(
    'response "%s" has verses with reference, text, and explanation',
    (id) => {
      const response = ASK_RESPONSES[id]
      for (const verse of response.verses) {
        expect(verse.reference.length).toBeGreaterThan(0)
        expect(verse.text.length).toBeGreaterThan(0)
        expect(verse.explanation.length).toBeGreaterThan(0)
      }
    }
  )
})

describe('ASK_RESPONSES — followUpQuestions', () => {
  it.each(ALL_TOPIC_IDS)('response "%s" has followUpQuestions array', (id) => {
    const response = ASK_RESPONSES[id]
    expect(response.followUpQuestions).toBeDefined()
    expect(Array.isArray(response.followUpQuestions)).toBe(true)
  })

  it.each(ALL_TOPIC_IDS)(
    'response "%s" has exactly 3 follow-up questions',
    (id) => {
      const response = ASK_RESPONSES[id]
      expect(response.followUpQuestions).toHaveLength(3)
    }
  )

  it.each(ALL_TOPIC_IDS)(
    'response "%s" follow-up questions are all under 60 characters',
    (id) => {
      const response = ASK_RESPONSES[id]
      for (const q of response.followUpQuestions) {
        expect(q.length, `"${q}" is ${q.length} chars`).toBeLessThanOrEqual(60)
      }
    }
  )

  it('fallback response has generic follow-up questions', () => {
    const fallback = ASK_RESPONSES.fallback
    expect(fallback.followUpQuestions).toEqual([
      'How do I hear God\'s voice?',
      'What does it mean to have faith?',
      'How can I trust God with my future?',
    ])
  })
})

describe('getAskResponse', () => {
  it('returns suffering response for "Why does God allow suffering?"', () => {
    const result = getAskResponse('Why does God allow suffering?')
    expect(result.id).toBe('suffering')
  })

  it('returns forgiveness response for "how do I forgive my brother"', () => {
    const result = getAskResponse('how do I forgive my brother')
    expect(result.id).toBe('forgiveness')
  })

  it('returns anxiety response for "I feel so anxious"', () => {
    const result = getAskResponse('I feel so anxious')
    expect(result.id).toBe('anxiety')
  })

  it('returns purpose response for "What is my purpose?"', () => {
    const result = getAskResponse('What is my purpose?')
    expect(result.id).toBe('purpose')
  })

  it('returns doubt response for "I doubt my faith"', () => {
    const result = getAskResponse('I doubt my faith')
    expect(result.id).toBe('doubt')
  })

  it('returns prayer response for "how to pray better"', () => {
    const result = getAskResponse('how to pray better')
    expect(result.id).toBe('prayer')
  })

  it('returns grief response for "dealing with grief"', () => {
    const result = getAskResponse('dealing with grief')
    expect(result.id).toBe('grief')
  })

  it('returns loneliness response for "I feel so lonely"', () => {
    const result = getAskResponse('I feel so lonely')
    expect(result.id).toBe('loneliness')
  })

  it('returns anger response for "I am so angry"', () => {
    const result = getAskResponse('I am so angry')
    expect(result.id).toBe('anger')
  })

  it('returns marriage response for "my marriage is struggling"', () => {
    const result = getAskResponse('my marriage is struggling')
    expect(result.id).toBe('marriage')
  })

  it('returns parenting response for "raising my children"', () => {
    const result = getAskResponse('raising my children')
    expect(result.id).toBe('parenting')
  })

  it('returns money response for "financial troubles and debt"', () => {
    const result = getAskResponse('financial troubles and debt')
    expect(result.id).toBe('money')
  })

  it('returns identity response for "I don\'t feel like I\'m enough"', () => {
    const result = getAskResponse("I don't feel like I'm enough")
    expect(result.id).toBe('identity')
  })

  it('returns temptation response for "struggling with temptation"', () => {
    const result = getAskResponse('struggling with temptation')
    expect(result.id).toBe('temptation')
  })

  it('returns afterlife response for "what happens after death"', () => {
    const result = getAskResponse('what happens after death')
    expect(result.id).toBe('afterlife')
  })

  it('returns fallback for "what is the meaning of life"', () => {
    const result = getAskResponse('what is the meaning of life')
    expect(result.id).toBe('fallback')
  })

  it('returns fallback for unrelated questions', () => {
    const result = getAskResponse('Tell me about quantum physics')
    expect(result.id).toBe('fallback')
  })

  it('keyword matching is case-insensitive', () => {
    const result = getAskResponse('SUFFERING is hard')
    expect(result.id).toBe('suffering')
  })

  it('keyword matching is case-insensitive for mixed case', () => {
    const result = getAskResponse('How do I FORGIVE?')
    expect(result.id).toBe('forgiveness')
  })

  it('first match wins when multiple topics could match', () => {
    // "hurt" matches suffering (first in order), "forgive" matches forgiveness (second)
    // "hurt" comes first in the question and also in the priority list
    const result = getAskResponse('I hurt and need to forgive')
    expect(result.id).toBe('suffering')
  })

  it('fallback response contains Proverbs 3:5-6', () => {
    const fallback = ASK_RESPONSES.fallback
    const references = fallback.verses.map((v) => v.reference)
    expect(references).toContain('Proverbs 3:5-6')
  })

  it('fallback response contains James 1:5', () => {
    const fallback = ASK_RESPONSES.fallback
    const references = fallback.verses.map((v) => v.reference)
    expect(references).toContain('James 1:5')
  })

  it('fallback response contains Psalm 32:8', () => {
    const fallback = ASK_RESPONSES.fallback
    const references = fallback.verses.map((v) => v.reference)
    expect(references).toContain('Psalm 32:8')
  })
})
