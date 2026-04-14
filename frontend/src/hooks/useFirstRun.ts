import { useState, useCallback } from 'react'

const FIRST_RUN_KEY = 'wr_first_run_completed'

export function useFirstRun(): {
  isFirstRun: boolean
  dismissFirstRun: () => void
} {
  const [isFirstRun, setIsFirstRun] = useState(() => {
    try {
      return localStorage.getItem(FIRST_RUN_KEY) === null
    } catch {
      return false
    }
  })

  const dismissFirstRun = useCallback(() => {
    try {
      localStorage.setItem(FIRST_RUN_KEY, String(Date.now()))
    } catch {
      // localStorage unavailable — welcome will show again next visit
    }
    setIsFirstRun(false)
  }, [])

  return { isFirstRun, dismissFirstRun }
}
