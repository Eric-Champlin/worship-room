import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAmbientSearch } from '../useAmbientSearch'

describe('useAmbientSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('search by sound name returns matching sounds', () => {
    const { result } = renderHook(() => useAmbientSearch())

    act(() => {
      result.current.setSearchQuery('rain')
      vi.advanceTimersByTime(300)
    })

    const soundNames = result.current.filteredSounds.map((s) => s.name)
    expect(soundNames).toContain('Gentle Rain')
    expect(soundNames).toContain('Rainy Window')
    // Should NOT contain non-matching sounds
    expect(soundNames).not.toContain('Forest Birds')
  })

  it('search by scene name returns matching scenes', () => {
    const { result } = renderHook(() => useAmbientSearch())

    act(() => {
      result.current.setSearchQuery('garden')
      vi.advanceTimersByTime(300)
    })

    const sceneNames = result.current.filteredScenes.map((s) => s.name)
    expect(sceneNames).toContain('Garden of Gethsemane')
    expect(sceneNames).not.toContain('Still Waters')
  })

  it('search by scene description returns matching scenes', () => {
    const { result } = renderHook(() => useAmbientSearch())

    act(() => {
      result.current.setSearchQuery('crickets')
      vi.advanceTimersByTime(300)
    })

    const sceneNames = result.current.filteredScenes.map((s) => s.name)
    expect(sceneNames).toContain('Garden of Gethsemane')
  })

  it('empty search returns all sounds and scenes', () => {
    const { result } = renderHook(() => useAmbientSearch())

    // Initially empty search — should return all
    expect(result.current.filteredSounds.length).toBe(24)
    expect(result.current.filteredScenes.length).toBe(11)
    expect(result.current.hasActiveSearch).toBe(false)
  })

  it('filter OR within dimension — mood', () => {
    const { result } = renderHook(() => useAmbientSearch())

    act(() => {
      result.current.toggleFilter('mood', 'peaceful')
      result.current.toggleFilter('mood', 'uplifting')
    })

    // Should include items matching either peaceful OR uplifting
    for (const sound of result.current.filteredSounds) {
      const hasPeaceful = sound.tags.mood.includes('peaceful')
      const hasUplifting = sound.tags.mood.includes('uplifting')
      expect(hasPeaceful || hasUplifting).toBe(true)
    }
    expect(result.current.filteredSounds.length).toBeGreaterThan(0)
  })

  it('filter AND across dimensions — mood + activity', () => {
    const { result } = renderHook(() => useAmbientSearch())

    act(() => {
      result.current.toggleFilter('mood', 'peaceful')
      result.current.toggleFilter('activity', 'sleep')
    })

    // Every sound must match both: mood includes peaceful AND activity includes sleep
    for (const sound of result.current.filteredSounds) {
      expect(sound.tags.mood.includes('peaceful')).toBe(true)
      expect(sound.tags.activity.includes('sleep')).toBe(true)
    }
    expect(result.current.filteredSounds.length).toBeGreaterThan(0)
  })

  it('scripture theme filter applies to scenes only — sounds always pass', () => {
    const { result } = renderHook(() => useAmbientSearch())

    act(() => {
      result.current.toggleFilter('scriptureTheme', 'trust')
    })

    // Sounds should still include all (scripture theme doesn't apply to sounds)
    expect(result.current.filteredSounds.length).toBe(24)

    // Scenes should be filtered to only those with 'trust' scripture theme
    for (const scene of result.current.filteredScenes) {
      expect(scene.tags.scriptureTheme).toContain('trust')
    }
    expect(result.current.filteredScenes.length).toBeGreaterThan(0)
    expect(result.current.filteredScenes.length).toBeLessThan(11)
  })

  it('combined search + filter returns only matching items', () => {
    const { result } = renderHook(() => useAmbientSearch())

    act(() => {
      result.current.setSearchQuery('rain')
      vi.advanceTimersByTime(300)
      result.current.toggleFilter('mood', 'peaceful')
    })

    // Should only have sounds matching both "rain" name AND "peaceful" mood
    for (const sound of result.current.filteredSounds) {
      expect(sound.name.toLowerCase()).toContain('rain')
      expect(sound.tags.mood.includes('peaceful')).toBe(true)
    }
  })

  it('clear search restores all items (filters still apply)', () => {
    const { result } = renderHook(() => useAmbientSearch())

    act(() => {
      result.current.setSearchQuery('rain')
      vi.advanceTimersByTime(300)
    })

    expect(result.current.filteredSounds.length).toBeLessThan(24)

    act(() => {
      result.current.clearSearch()
    })

    // All sounds should be back (no filters active)
    expect(result.current.filteredSounds.length).toBe(24)
    expect(result.current.filteredScenes.length).toBe(11)
    expect(result.current.hasActiveSearch).toBe(false)
  })

  it('active filter count tracks total active filters', () => {
    const { result } = renderHook(() => useAmbientSearch())

    expect(result.current.activeFilterCount).toBe(0)

    act(() => {
      result.current.toggleFilter('mood', 'peaceful')
      result.current.toggleFilter('activity', 'sleep')
      result.current.toggleFilter('intensity', 'very_calm')
    })

    expect(result.current.activeFilterCount).toBe(3)

    // Toggle one off
    act(() => {
      result.current.toggleFilter('mood', 'peaceful')
    })

    expect(result.current.activeFilterCount).toBe(2)
  })
})
