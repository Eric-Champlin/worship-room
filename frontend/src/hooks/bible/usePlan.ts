import { useEffect, useState } from 'react'

import type { Plan, PlanProgress } from '@/types/bible-plans'

import { loadPlan } from '@/lib/bible/planLoader'
import { getPlanProgress, subscribe } from '@/lib/bible/plansStore'

export interface UsePlanResult {
  plan: Plan | null
  progress: PlanProgress | null
  isLoading: boolean
  isError: boolean
}

export function usePlan(slug: string): UsePlanResult {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [progress, setProgress] = useState<PlanProgress | null>(() => getPlanProgress(slug))

  // Load plan JSON
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setIsError(false)

    loadPlan(slug).then(({ plan: loaded, error }) => {
      if (cancelled) return
      setPlan(loaded)
      setIsError(!!error)
      setIsLoading(false)
    }).catch(() => {
      if (!cancelled) {
        setIsError(true)
        setIsLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [slug])

  // Subscribe to progress updates
  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setProgress(getPlanProgress(slug))
    })
    return unsubscribe
  }, [slug])

  return { plan, progress, isLoading, isError }
}
