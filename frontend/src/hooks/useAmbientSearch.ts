import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SOUND_CATALOG } from '@/data/sound-catalog'
import { SCENE_PRESETS } from '@/data/scenes'
import type { Sound, SoundMood, SoundActivity, SoundIntensity, ScenePreset } from '@/types/music'

const SEARCH_DEBOUNCE_MS = 200

export interface FilterState {
  mood: SoundMood[]
  activity: SoundActivity[]
  intensity: SoundIntensity[]
  scriptureTheme: string[]
}

const EMPTY_FILTERS: FilterState = {
  mood: [],
  activity: [],
  intensity: [],
  scriptureTheme: [],
}

export interface UseAmbientSearchReturn {
  searchQuery: string
  setSearchQuery: (q: string) => void
  clearSearch: () => void
  filters: FilterState
  toggleFilter: (dimension: keyof FilterState, value: string) => void
  clearFilters: () => void
  activeFilterCount: number
  isFilterPanelOpen: boolean
  setFilterPanelOpen: (open: boolean) => void
  filteredScenes: ScenePreset[]
  filteredSounds: Sound[]
  hasActiveSearch: boolean
  hasActiveFilters: boolean
}

function matchesSearch(query: string, ...texts: string[]): boolean {
  const lower = query.toLowerCase()
  return texts.some((t) => t.toLowerCase().includes(lower))
}

function soundPassesFilters(sound: Sound, filters: FilterState): boolean {
  // Mood: OR within dimension
  if (filters.mood.length > 0) {
    if (!filters.mood.some((m) => sound.tags.mood.includes(m))) return false
  }
  // Activity: OR within dimension
  if (filters.activity.length > 0) {
    if (!filters.activity.some((a) => sound.tags.activity.includes(a))) return false
  }
  // Intensity: OR within dimension
  if (filters.intensity.length > 0) {
    if (!filters.intensity.includes(sound.tags.intensity)) return false
  }
  // Scripture theme: sounds always pass (filter applies to scenes only)
  return true
}

function scenePassesFilters(scene: ScenePreset, filters: FilterState): boolean {
  // Mood: OR within dimension
  if (filters.mood.length > 0) {
    if (!filters.mood.some((m) => scene.tags.mood.includes(m))) return false
  }
  // Activity: OR within dimension
  if (filters.activity.length > 0) {
    if (!filters.activity.some((a) => scene.tags.activity.includes(a))) return false
  }
  // Intensity: OR within dimension
  if (filters.intensity.length > 0) {
    if (!filters.intensity.includes(scene.tags.intensity)) return false
  }
  // Scripture theme: OR within dimension
  if (filters.scriptureTheme.length > 0) {
    if (!scene.tags.scriptureTheme?.some((t) => filters.scriptureTheme.includes(t))) {
      return false
    }
  }
  return true
}

export function useAmbientSearch(): UseAmbientSearchReturn {
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [inputQuery, setInputQuery] = useState('')
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [isFilterPanelOpen, setFilterPanelOpen] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const setSearchQuery = useCallback((q: string) => {
    setInputQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(q)
    }, SEARCH_DEBOUNCE_MS)
  }, [])

  const clearSearch = useCallback(() => {
    setInputQuery('')
    setDebouncedQuery('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  const toggleFilter = useCallback(
    (dimension: keyof FilterState, value: string) => {
      setFilters((prev) => {
        const current = prev[dimension] as string[]
        const next = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value]
        return { ...prev, [dimension]: next }
      })
    },
    [],
  )

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS)
  }, [])

  const activeFilterCount = useMemo(
    () =>
      filters.mood.length +
      filters.activity.length +
      filters.intensity.length +
      filters.scriptureTheme.length,
    [filters],
  )

  const hasActiveSearch = debouncedQuery.length > 0
  const hasActiveFilters = activeFilterCount > 0

  const filteredScenes = useMemo(() => {
    let result = SCENE_PRESETS
    if (hasActiveSearch) {
      result = result.filter((s) =>
        matchesSearch(debouncedQuery, s.name, s.description),
      )
    }
    if (hasActiveFilters) {
      result = result.filter((s) => scenePassesFilters(s, filters))
    }
    return result
  }, [debouncedQuery, filters, hasActiveSearch, hasActiveFilters])

  const filteredSounds = useMemo(() => {
    let result = SOUND_CATALOG
    if (hasActiveSearch) {
      result = result.filter((s) => matchesSearch(debouncedQuery, s.name))
    }
    if (hasActiveFilters) {
      result = result.filter((s) => soundPassesFilters(s, filters))
    }
    return result
  }, [debouncedQuery, filters, hasActiveSearch, hasActiveFilters])

  return {
    searchQuery: inputQuery,
    setSearchQuery,
    clearSearch,
    filters,
    toggleFilter,
    clearFilters,
    activeFilterCount,
    isFilterPanelOpen,
    setFilterPanelOpen,
    filteredScenes,
    filteredSounds,
    hasActiveSearch,
    hasActiveFilters,
  }
}
