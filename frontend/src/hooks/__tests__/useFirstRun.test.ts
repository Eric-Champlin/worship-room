import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFirstRun } from '../useFirstRun'

const FIRST_RUN_KEY = 'wr_first_run_completed'

beforeEach(() => {
  localStorage.clear()
})

describe('useFirstRun', () => {
  it('returns true when key is absent', () => {
    const { result } = renderHook(() => useFirstRun())
    expect(result.current.isFirstRun).toBe(true)
  })

  it('returns false when key is present', () => {
    localStorage.setItem(FIRST_RUN_KEY, String(Date.now()))
    const { result } = renderHook(() => useFirstRun())
    expect(result.current.isFirstRun).toBe(false)
  })

  it('dismissFirstRun sets key in localStorage', () => {
    const { result } = renderHook(() => useFirstRun())
    act(() => {
      result.current.dismissFirstRun()
    })
    expect(localStorage.getItem(FIRST_RUN_KEY)).not.toBeNull()
  })

  it('dismissFirstRun updates state to false', () => {
    const { result } = renderHook(() => useFirstRun())
    expect(result.current.isFirstRun).toBe(true)
    act(() => {
      result.current.dismissFirstRun()
    })
    expect(result.current.isFirstRun).toBe(false)
  })
})
