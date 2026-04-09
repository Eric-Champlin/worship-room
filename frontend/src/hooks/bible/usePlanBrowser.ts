import { useSyncExternalStore } from 'react'
import { useSearchParams } from 'react-router-dom'

import {
  filterPlans,
  parseDurationParam,
  parseThemeParam,
  splitIntoSections,
  type DurationFilter,
  type PlanBrowserSections,
} from '@/lib/bible/plans/planFilters'
import { getPlansState, subscribe } from '@/lib/bible/plansStore'
import type { PlanMetadata, PlanTheme } from '@/types/bible-plans'

import { usePlansManifest } from './usePlansManifest'

export interface UsePlanBrowserResult {
  sections: PlanBrowserSections
  filteredBrowse: PlanMetadata[]
  theme: PlanTheme | 'all'
  duration: DurationFilter
  setTheme: (theme: PlanTheme | 'all') => void
  setDuration: (duration: DurationFilter) => void
  clearFilters: () => void
  isEmpty: boolean
  isFilteredEmpty: boolean
  isAllStarted: boolean
}

export function usePlanBrowser(): UsePlanBrowserResult {
  const { plans: manifest } = usePlansManifest()
  const [searchParams, setSearchParams] = useSearchParams()

  // Reactively track plan progress
  const storeState = useSyncExternalStore(subscribe, getPlansState)

  // Derive filter state from URL
  const theme = parseThemeParam(searchParams.get('theme'))
  const duration = parseDurationParam(searchParams.get('duration'))

  // Split plans into sections based on progress
  const sections = splitIntoSections(manifest, storeState.plans)

  // Apply filters to browse section only
  const filteredBrowse = filterPlans(sections.browse, theme, duration)

  const isEmpty = manifest.length === 0

  const isDefaultFilters = theme === 'all' && duration === 'any'

  const isFilteredEmpty = !isEmpty && filteredBrowse.length === 0 && !isDefaultFilters

  const isAllStarted = !isEmpty && sections.browse.length === 0 && isDefaultFilters

  const setTheme = (newTheme: PlanTheme | 'all') => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (newTheme === 'all') {
          next.delete('theme')
        } else {
          next.set('theme', newTheme)
        }
        return next
      },
      { replace: false },
    )
  }

  const setDuration = (newDuration: DurationFilter) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (newDuration === 'any') {
          next.delete('duration')
        } else {
          next.set('duration', newDuration)
        }
        return next
      },
      { replace: false },
    )
  }

  const clearFilters = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('theme')
        next.delete('duration')
        return next
      },
      { replace: false },
    )
  }

  return {
    sections,
    filteredBrowse,
    theme,
    duration,
    setTheme,
    setDuration,
    clearFilters,
    isEmpty,
    isFilteredEmpty,
    isAllStarted,
  }
}
