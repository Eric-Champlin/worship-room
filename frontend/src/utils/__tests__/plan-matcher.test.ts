import { describe, it, expect } from 'vitest'
import { matchPlanByKeywords } from '../plan-matcher'

describe('matchPlanByKeywords', () => {
  it('matches anxiety keywords', () => {
    expect(matchPlanByKeywords('I feel so anxious about everything')).toBe('finding-peace-in-anxiety')
    expect(matchPlanByKeywords('work stress is killing me')).toBe('finding-peace-in-anxiety')
    expect(matchPlanByKeywords('I worry all the time')).toBe('finding-peace-in-anxiety')
    expect(matchPlanByKeywords("I'm overwhelmed")).toBe('finding-peace-in-anxiety')
    expect(matchPlanByKeywords('having panic attacks')).toBe('finding-peace-in-anxiety')
  })

  it('matches grief keywords', () => {
    expect(matchPlanByKeywords('dealing with grief after my father')).toBe('walking-through-grief')
    expect(matchPlanByKeywords('the loss of my mother')).toBe('walking-through-grief')
    expect(matchPlanByKeywords('my friend died last month')).toBe('walking-through-grief')
    expect(matchPlanByKeywords('mourning a loved one')).toBe('walking-through-grief')
  })

  it('matches gratitude keywords', () => {
    expect(matchPlanByKeywords('I want to be more grateful')).toBe('the-gratitude-reset')
    expect(matchPlanByKeywords('counting my blessings')).toBe('the-gratitude-reset')
    expect(matchPlanByKeywords('feeling thankful')).toBe('the-gratitude-reset')
  })

  it('matches identity keywords', () => {
    expect(matchPlanByKeywords('struggling with my identity')).toBe('knowing-who-you-are-in-christ')
    expect(matchPlanByKeywords('who am i really')).toBe('knowing-who-you-are-in-christ')
    expect(matchPlanByKeywords('dealing with insecurity')).toBe('knowing-who-you-are-in-christ')
  })

  it('matches forgiveness keywords', () => {
    expect(matchPlanByKeywords('I need to forgive someone')).toBe('the-path-to-forgiveness')
    expect(matchPlanByKeywords('feeling bitter and resentment')).toBe('the-path-to-forgiveness')
    expect(matchPlanByKeywords('hurt by a friend')).toBe('the-path-to-forgiveness')
  })

  it('matches trust keywords', () => {
    expect(matchPlanByKeywords('learning to trust God')).toBe('learning-to-trust-god')
    expect(matchPlanByKeywords('I have so much doubt')).toBe('learning-to-trust-god')
    expect(matchPlanByKeywords('hard to believe anymore')).toBe('learning-to-trust-god')
  })

  it('matches hope keywords', () => {
    expect(matchPlanByKeywords('feeling hopeless')).toBe('hope-when-its-hard')
    expect(matchPlanByKeywords('going through dark times')).toBe('hope-when-its-hard')
    expect(matchPlanByKeywords('I see no way out')).toBe('hope-when-its-hard')
  })

  it('matches healing keywords', () => {
    expect(matchPlanByKeywords('I feel broken inside')).toBe('healing-from-the-inside-out')
    expect(matchPlanByKeywords('recovering from trauma')).toBe('healing-from-the-inside-out')
    expect(matchPlanByKeywords('emotional pain')).toBe('healing-from-the-inside-out')
  })

  it('matches purpose keywords', () => {
    expect(matchPlanByKeywords('searching for my purpose')).toBe('discovering-your-purpose')
    expect(matchPlanByKeywords('what should i do with my life')).toBe('discovering-your-purpose')
    expect(matchPlanByKeywords('looking for meaning')).toBe('discovering-your-purpose')
  })

  it('matches relationship keywords', () => {
    expect(matchPlanByKeywords('my marriage is struggling')).toBe('building-stronger-relationships')
    expect(matchPlanByKeywords('feeling lonely and isolated')).toBe('building-stronger-relationships')
    expect(matchPlanByKeywords('family problems')).toBe('building-stronger-relationships')
  })

  it('falls back to learning-to-trust-god for no match', () => {
    expect(matchPlanByKeywords('something random')).toBe('learning-to-trust-god')
    expect(matchPlanByKeywords('hello world')).toBe('learning-to-trust-god')
    expect(matchPlanByKeywords('   ')).toBe('learning-to-trust-god')
  })

  it('is case-insensitive', () => {
    expect(matchPlanByKeywords('ANXIETY is hard')).toBe('finding-peace-in-anxiety')
    expect(matchPlanByKeywords('Grief and Loss')).toBe('walking-through-grief')
    expect(matchPlanByKeywords('WHO AM I')).toBe('knowing-who-you-are-in-christ')
  })

  it('matches multi-word keywords', () => {
    expect(matchPlanByKeywords('who am i in this world')).toBe('knowing-who-you-are-in-christ')
    expect(matchPlanByKeywords('hurt by someone I loved')).toBe('the-path-to-forgiveness')
    expect(matchPlanByKeywords('what should i do next')).toBe('discovering-your-purpose')
    expect(matchPlanByKeywords('hard to believe in anything')).toBe('learning-to-trust-god')
  })

  it('uses first match when multiple keywords match different plans', () => {
    // "anxiety" matches first (index 0), even though "pain" matches healing (index 7)
    expect(matchPlanByKeywords('anxiety and pain')).toBe('finding-peace-in-anxiety')
  })
})
