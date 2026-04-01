import { renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useGardenElements } from '../useGardenElements'

function makeDailyActivities(
  count: number,
  flags: Record<string, boolean>,
): Record<string, Record<string, boolean>> {
  const log: Record<string, Record<string, boolean>> = {}
  for (let i = 0; i < count; i++) {
    log[`2026-03-${String(i + 1).padStart(2, '0')}`] = { ...flags }
  }
  return log
}

function makeSessions(count: number): { id: string }[] {
  return Array.from({ length: count }, (_, i) => ({ id: `session-${i}` }))
}

function makeBibleProgress(totalChapters: number): Record<string, number[]> {
  const chapters: number[] = []
  for (let i = 1; i <= totalChapters; i++) chapters.push(i)
  return { genesis: chapters }
}

describe('useGardenElements', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns all false when localStorage is empty', () => {
    const { result } = renderHook(() => useGardenElements())
    expect(result.current).toEqual({
      writingDesk: false,
      cushion: false,
      candle: false,
      bible: false,
      windChime: false,
    })
  })

  it('returns writingDesk true when journal days >= 10', () => {
    localStorage.setItem(
      'wr_daily_activities',
      JSON.stringify(makeDailyActivities(10, { journal: true })),
    )
    const { result } = renderHook(() => useGardenElements())
    expect(result.current.writingDesk).toBe(true)
  })

  it('returns writingDesk false when journal days < 10', () => {
    localStorage.setItem(
      'wr_daily_activities',
      JSON.stringify(makeDailyActivities(9, { journal: true })),
    )
    const { result } = renderHook(() => useGardenElements())
    expect(result.current.writingDesk).toBe(false)
  })

  it('returns cushion true when meditation sessions >= 10', () => {
    localStorage.setItem('wr_meditation_history', JSON.stringify(makeSessions(10)))
    const { result } = renderHook(() => useGardenElements())
    expect(result.current.cushion).toBe(true)
  })

  it('returns bible true when chapters >= 10', () => {
    localStorage.setItem('wr_bible_progress', JSON.stringify(makeBibleProgress(10)))
    const { result } = renderHook(() => useGardenElements())
    expect(result.current.bible).toBe(true)
  })

  it('returns windChime true when listening >= 10', () => {
    localStorage.setItem('wr_listening_history', JSON.stringify(makeSessions(10)))
    const { result } = renderHook(() => useGardenElements())
    expect(result.current.windChime).toBe(true)
  })

  it('returns candle true when prayer wall days >= 10', () => {
    localStorage.setItem(
      'wr_daily_activities',
      JSON.stringify(makeDailyActivities(10, { prayerWall: true })),
    )
    const { result } = renderHook(() => useGardenElements())
    expect(result.current.candle).toBe(true)
  })

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem('wr_daily_activities', 'not-json')
    localStorage.setItem('wr_meditation_history', '{broken')
    localStorage.setItem('wr_bible_progress', '123')
    localStorage.setItem('wr_listening_history', 'null')
    const { result } = renderHook(() => useGardenElements())
    expect(result.current).toEqual({
      writingDesk: false,
      cushion: false,
      candle: false,
      bible: false,
      windChime: false,
    })
  })

  it('memoizes result (no re-computation on re-render)', () => {
    localStorage.setItem('wr_meditation_history', JSON.stringify(makeSessions(10)))
    const { result, rerender } = renderHook(() => useGardenElements())
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })
})
