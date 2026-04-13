import { describe, expect, it } from 'vitest'

import { getMatchedInterval, getRelativeLabel } from '../labels'

describe('getMatchedInterval', () => {
  it('returns 7 for exactly 7 days', () => {
    expect(getMatchedInterval(7)).toBe(7)
  })

  it('returns 7 for 6 days (tolerance -1)', () => {
    expect(getMatchedInterval(6)).toBe(7)
  })

  it('returns 7 for 8 days (tolerance +1)', () => {
    expect(getMatchedInterval(8)).toBe(7)
  })

  it('returns null for 5 days (below tolerance)', () => {
    expect(getMatchedInterval(5)).toBeNull()
  })

  it('returns null for 10 days (between intervals)', () => {
    expect(getMatchedInterval(10)).toBeNull()
  })

  it('returns 14 for 14 days', () => {
    expect(getMatchedInterval(14)).toBe(14)
  })

  it('returns 30 for 30 days', () => {
    expect(getMatchedInterval(30)).toBe(30)
  })

  it('returns 60 for 60 days', () => {
    expect(getMatchedInterval(60)).toBe(60)
  })

  it('returns 90 for 90 days', () => {
    expect(getMatchedInterval(90)).toBe(90)
  })

  it('returns 180 for 180 days', () => {
    expect(getMatchedInterval(180)).toBe(180)
  })

  it('returns 365 for 365 days', () => {
    expect(getMatchedInterval(365)).toBe(365)
  })

  it('returns null for 0 days', () => {
    expect(getMatchedInterval(0)).toBeNull()
  })
})

describe('getRelativeLabel', () => {
  it('returns "a week ago" for interval 7', () => {
    expect(getRelativeLabel(7, 'highlighted')).toBe('a week ago')
  })

  it('returns "two weeks ago" for interval 14', () => {
    expect(getRelativeLabel(14, 'highlighted')).toBe('two weeks ago')
  })

  it('returns "a month ago" for interval 30', () => {
    expect(getRelativeLabel(30, 'memorized')).toBe('a month ago')
  })

  it('returns "two months ago" for interval 60', () => {
    expect(getRelativeLabel(60, 'highlighted')).toBe('two months ago')
  })

  it('returns "three months ago" for interval 90', () => {
    expect(getRelativeLabel(90, 'highlighted')).toBe('three months ago')
  })

  it('returns "six months ago" for interval 180', () => {
    expect(getRelativeLabel(180, 'highlighted')).toBe('six months ago')
  })

  it('returns "a year ago" for interval 365', () => {
    expect(getRelativeLabel(365, 'memorized')).toBe('a year ago')
  })

  it('returns "on this day last year" for read-on-this-day with year diff of 1', () => {
    const lastYear = new Date().getFullYear() - 1
    expect(getRelativeLabel(0, 'read-on-this-day', lastYear)).toBe('on this day last year')
  })

  it('returns "on this day in [year]" for read-on-this-day with year diff > 1', () => {
    const twoYearsAgo = new Date().getFullYear() - 2
    expect(getRelativeLabel(0, 'read-on-this-day', twoYearsAgo)).toBe(
      `on this day in ${twoYearsAgo}`,
    )
  })
})
