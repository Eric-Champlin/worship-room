import { describe, expect, it } from 'vitest'
import { POST_TYPES } from '@/constants/post-types'
import { PER_TYPE_CHROME, getPerTypeChromeClass } from '../post-type-chrome'

describe('PER_TYPE_CHROME (Spec 5.5 canonical Visual Rollout opacities)', () => {
  it('has an entry for every PostType in POST_TYPES', () => {
    for (const entry of POST_TYPES) {
      expect(PER_TYPE_CHROME).toHaveProperty(entry.id)
    }
  })

  it('prayer_request is empty (no per-type overlay)', () => {
    expect(PER_TYPE_CHROME.prayer_request).toBe('')
    expect(getPerTypeChromeClass('prayer_request')).toBe('')
  })

  it('testimony uses canonical /[0.08] background and /[0.12] border (amber)', () => {
    expect(PER_TYPE_CHROME.testimony).toContain('bg-amber-500/[0.08]')
    expect(PER_TYPE_CHROME.testimony).toContain('border-amber-200/[0.12]')
  })

  it('question uses canonical /[0.08] background and /[0.12] border (cyan)', () => {
    expect(PER_TYPE_CHROME.question).toContain('bg-cyan-500/[0.08]')
    expect(PER_TYPE_CHROME.question).toContain('border-cyan-200/[0.12]')
  })

  it('discussion uses canonical /[0.08] background and /[0.12] border (violet)', () => {
    expect(PER_TYPE_CHROME.discussion).toContain('bg-violet-500/[0.08]')
    expect(PER_TYPE_CHROME.discussion).toContain('border-violet-200/[0.12]')
  })

  it('encouragement uses canonical /[0.08] background and /[0.12] border (rose)', () => {
    expect(PER_TYPE_CHROME.encouragement).toContain('bg-rose-500/[0.08]')
    expect(PER_TYPE_CHROME.encouragement).toContain('border-rose-200/[0.12]')
  })

  it('does NOT contain deprecated /[0.04] background opacity', () => {
    const allValues = Object.values(PER_TYPE_CHROME).join(' ')
    expect(allValues).not.toContain('/[0.04]')
  })

  it('does NOT contain deprecated /10 border opacity', () => {
    const allValues = Object.values(PER_TYPE_CHROME).join(' ')
    expect(allValues).not.toMatch(/border-\w+-\d+\/10\b/)
  })

  it('preserves per-type COLORS unchanged (amber/cyan/violet/rose)', () => {
    expect(PER_TYPE_CHROME.testimony).toContain('amber')
    expect(PER_TYPE_CHROME.question).toContain('cyan')
    expect(PER_TYPE_CHROME.discussion).toContain('violet')
    expect(PER_TYPE_CHROME.encouragement).toContain('rose')
  })

  it('getPerTypeChromeClass returns the right string per post type', () => {
    expect(getPerTypeChromeClass('testimony')).toBe(PER_TYPE_CHROME.testimony)
    expect(getPerTypeChromeClass('question')).toBe(PER_TYPE_CHROME.question)
    expect(getPerTypeChromeClass('discussion')).toBe(PER_TYPE_CHROME.discussion)
    expect(getPerTypeChromeClass('encouragement')).toBe(PER_TYPE_CHROME.encouragement)
  })
})
