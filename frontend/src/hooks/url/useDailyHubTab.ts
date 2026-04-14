import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

export type DailyHubTab = 'devotional' | 'pray' | 'journal' | 'meditate'

const VALID_TABS: readonly DailyHubTab[] = ['devotional', 'pray', 'journal', 'meditate']
const DEFAULT_TAB: DailyHubTab = 'devotional'

function isValidTab(value: string | null): value is DailyHubTab {
  return value !== null && (VALID_TABS as readonly string[]).includes(value)
}

interface UseDailyHubTabReturn {
  tab: DailyHubTab
  setTab: (tab: DailyHubTab) => void
}

/**
 * BB-38: Reads and writes the ?tab= query parameter for the Daily Hub.
 *
 * Extracted from the pre-BB-38 `DailyHub.tsx` pattern (unchanged behavior):
 *   - Default tab is 'devotional' when no param is present or value is invalid
 *   - Writes push a history entry
 *   - Writes REPLACE the entire search-params dict with just { tab } to match
 *     the existing DailyHub.tsx behavior that clears cross-feature context
 *     params (context, prompt, verseRef, verseText, verseTheme) on tab switch
 */
export function useDailyHubTab(): UseDailyHubTabReturn {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get('tab')
  const tab: DailyHubTab = isValidTab(raw) ? raw : DEFAULT_TAB

  const setTab = useCallback(
    (nextTab: DailyHubTab) => {
      setSearchParams({ tab: nextTab }, { replace: false })
    },
    [setSearchParams],
  )

  return { tab, setTab }
}
