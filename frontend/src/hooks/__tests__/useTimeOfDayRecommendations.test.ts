import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useTimeOfDayRecommendations } from '../useTimeOfDayRecommendations'

describe('useTimeOfDayRecommendations', () => {
  it('returns "Suggested for You" heading at 9am', () => {
    const { result } = renderHook(() => useTimeOfDayRecommendations(9))
    expect(result.current.heading).toBe('Suggested for You')
    expect(result.current.timeBracket).toBe('morning')
  })

  it('returns "Great for Focus" heading at 2pm', () => {
    const { result } = renderHook(() => useTimeOfDayRecommendations(14))
    expect(result.current.heading).toBe('Great for Focus')
    expect(result.current.timeBracket).toBe('afternoon')
  })

  it('returns "Wind Down Tonight" heading at 8pm', () => {
    const { result } = renderHook(() => useTimeOfDayRecommendations(20))
    expect(result.current.heading).toBe('Wind Down Tonight')
    expect(result.current.timeBracket).toBe('evening')
  })

  it('returns "Ready for Rest" heading at 11pm', () => {
    const { result } = renderHook(() => useTimeOfDayRecommendations(23))
    expect(result.current.heading).toBe('Ready for Rest')
    expect(result.current.timeBracket).toBe('night')
  })

  it('returns generic items when no history', () => {
    const { result } = renderHook(() => useTimeOfDayRecommendations(9))
    expect(result.current.items.length).toBeGreaterThan(0)
    expect(result.current.items.every((item) => item.type === 'scene')).toBe(true)
  })
})
