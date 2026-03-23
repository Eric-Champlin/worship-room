import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useLiturgicalSeason } from '../useLiturgicalSeason'

describe('useLiturgicalSeason', () => {
  it('returns correct season for a date override (Christmas)', () => {
    const { result } = renderHook(() => useLiturgicalSeason(new Date(2026, 11, 25)))
    expect(result.current.currentSeason.id).toBe('christmas')
    expect(result.current.seasonName).toBe('Christmas')
    expect(result.current.greeting).toBe('Merry Christmas')
  })

  it('returns all expected fields', () => {
    const { result } = renderHook(() => useLiturgicalSeason(new Date(2026, 2, 1)))
    const season = result.current
    expect(season.currentSeason).toBeDefined()
    expect(season.seasonName).toBeTruthy()
    expect(season.themeColor).toMatch(/^#/)
    expect(season.icon).toBeTruthy()
    expect(typeof season.greeting).toBe('string')
    expect(typeof season.daysUntilNextSeason).toBe('number')
    expect(typeof season.isNamedSeason).toBe('boolean')
  })

  it('returns isNamedSeason=false during Ordinary Time', () => {
    const { result } = renderHook(() => useLiturgicalSeason(new Date(2026, 6, 15)))
    expect(result.current.isNamedSeason).toBe(false)
    expect(result.current.currentSeason.id).toBe('ordinary-time')
  })

  it('memoizes result (same reference for same input)', () => {
    const date = new Date(2026, 11, 25)
    const { result, rerender } = renderHook(() => useLiturgicalSeason(date))
    const firstResult = result.current
    rerender()
    expect(result.current).toBe(firstResult)
  })
})
