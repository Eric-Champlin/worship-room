import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutosave } from '../useAutosave'

describe('useAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initial status is idle', () => {
    const onSave = vi.fn()
    const { result } = renderHook(() =>
      useAutosave({ value: '', onSave }),
    )
    expect(result.current.status).toBe('idle')
  })

  it('status becomes saving then saved after delay', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() =>
      useAutosave({ value: 'hello', onSave, delay: 1000 }),
    )

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    expect(onSave).toHaveBeenCalledWith('hello')
    expect(result.current.status).toBe('saved')
  })

  it('debounce resets on each value change', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { rerender } = renderHook(
      ({ value }) => useAutosave({ value, onSave, delay: 1000 }),
      { initialProps: { value: 'a' } },
    )

    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    rerender({ value: 'ab' })

    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    // Should not have fired yet — timer reset on rerender
    expect(onSave).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    expect(onSave).toHaveBeenCalledWith('ab')
  })

  it('flush saves immediately', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() =>
      useAutosave({ value: 'test', onSave, delay: 5000 }),
    )

    await act(async () => {
      result.current.flush()
    })

    expect(onSave).toHaveBeenCalledWith('test')
    expect(result.current.status).toBe('saved')
  })

  it('flush no-ops when value unchanged since last save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() =>
      useAutosave({ value: 'test', onSave, delay: 1000 }),
    )

    // First save via timer
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(onSave).toHaveBeenCalledTimes(1)

    // Flush should not save again — value hasn't changed
    await act(async () => {
      result.current.flush()
    })
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('status becomes error when onSave throws', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Storage full'))
    const { result } = renderHook(() =>
      useAutosave({ value: 'test', onSave, delay: 1000 }),
    )

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.status).toBe('error')
  })

  it('enabled: false prevents auto-save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    renderHook(() =>
      useAutosave({ value: 'test', onSave, delay: 1000, enabled: false }),
    )

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(onSave).not.toHaveBeenCalled()
  })

  it('skip save when value unchanged', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { rerender } = renderHook(
      ({ value }) => useAutosave({ value, onSave, delay: 1000 }),
      { initialProps: { value: 'test' } },
    )

    // First save
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(onSave).toHaveBeenCalledTimes(1)

    // Re-render with same value
    rerender({ value: 'test' })

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    // Should not save again
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('lastSavedAt updates on successful save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() =>
      useAutosave({ value: 'test', onSave, delay: 1000 }),
    )

    expect(result.current.lastSavedAt).toBeNull()

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.lastSavedAt).toBeGreaterThan(0)
  })

  it('cleanup cancels pending timer on unmount', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { unmount } = renderHook(() =>
      useAutosave({ value: 'test', onSave, delay: 1000 }),
    )

    unmount()

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(onSave).not.toHaveBeenCalled()
  })

  it('custom delay is respected', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    renderHook(() =>
      useAutosave({ value: 'test', onSave, delay: 3000 }),
    )

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(onSave).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('concurrent value changes during save — latest value wins', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { rerender } = renderHook(
      ({ value }) => useAutosave({ value, onSave, delay: 1000 }),
      { initialProps: { value: 'first' } },
    )

    // Trigger first save
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(onSave).toHaveBeenCalledWith('first')

    // Change value — should start a new timer
    rerender({ value: 'second' })
    rerender({ value: 'third' })

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(onSave).toHaveBeenLastCalledWith('third')
  })
})
