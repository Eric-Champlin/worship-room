import { describe, it, expect } from 'vitest'
import { formatSummaryLine } from '../intercessor-summary'

describe('formatSummaryLine', () => {
  const named = (name: string) => ({ displayName: name, isAnonymous: false })
  const anon = () => ({ displayName: 'Anonymous', isAnonymous: true })

  it('returns the empty-state copy when count is 0', () => {
    expect(formatSummaryLine(0, [])).toBe('No one has prayed for this yet')
  })

  it('returns "<Name> is praying" for a single named entry', () => {
    expect(formatSummaryLine(1, [named('Sarah')])).toBe('Sarah is praying')
  })

  it('returns "Someone is praying anonymously" for a single anonymous entry', () => {
    expect(formatSummaryLine(1, [anon()])).toBe('Someone is praying anonymously')
  })

  it('joins two entries with "and"', () => {
    expect(formatSummaryLine(2, [named('Sarah'), anon()])).toBe(
      'Sarah and Anonymous are praying',
    )
  })

  it('Oxford-commas three entries', () => {
    expect(
      formatSummaryLine(3, [named('Sarah'), anon(), named('Mark')]),
    ).toBe('Sarah, Anonymous, and Mark are praying')
  })

  it('uses "and 1 other" singular for count=4', () => {
    expect(
      formatSummaryLine(4, [named('Sarah'), anon(), named('Mark')]),
    ).toBe('Sarah, Anonymous, Mark, and 1 other are praying')
  })

  it('uses "and N others" plural for count>=5', () => {
    expect(
      formatSummaryLine(5, [named('Sarah'), anon(), named('Mark')]),
    ).toBe('Sarah, Anonymous, Mark, and 2 others are praying')
    expect(
      formatSummaryLine(50, [named('Sarah'), anon(), named('Mark')]),
    ).toBe('Sarah, Anonymous, Mark, and 47 others are praying')
  })

  it('returns count-only fallback when firstThree is empty and count > 0', () => {
    expect(formatSummaryLine(1, [])).toBe('Someone is praying')
    expect(formatSummaryLine(2, [])).toBe('2 people are praying')
    expect(formatSummaryLine(47, [])).toBe('47 people are praying')
  })
})
