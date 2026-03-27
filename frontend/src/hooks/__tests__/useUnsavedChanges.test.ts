import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Undo the global mock so we can test the real implementation
vi.unmock('@/hooks/useUnsavedChanges')

import { useUnsavedChanges } from '../useUnsavedChanges'

describe('useUnsavedChanges', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('adds beforeunload listener when dirty', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    renderHook(() => useUnsavedChanges(true))
    expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
  })

  it('removes beforeunload listener when not dirty', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { rerender } = renderHook(({ dirty }) => useUnsavedChanges(dirty), {
      initialProps: { dirty: true },
    })
    rerender({ dirty: false })
    expect(removeSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
  })

  it('cleans up beforeunload listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useUnsavedChanges(true))
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
  })

  it('showModal is false without data router', () => {
    const { result } = renderHook(() => useUnsavedChanges(false))
    expect(result.current.showModal).toBe(false)
  })

  it('showModal is always false without data router even when dirty', () => {
    const { result } = renderHook(() => useUnsavedChanges(true))
    expect(result.current.showModal).toBe(false)
  })

  it('confirmLeave and cancelLeave are callable no-ops without data router', () => {
    const { result } = renderHook(() => useUnsavedChanges(true))
    // Should not throw
    act(() => result.current.confirmLeave())
    act(() => result.current.cancelLeave())
  })
})
