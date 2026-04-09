import { loadManifest } from '@/lib/bible/planLoader'
import type { PlanMetadata } from '@/types/bible-plans'

export interface UsePlansManifestResult {
  plans: PlanMetadata[]
  isLoading: boolean
}

export function usePlansManifest(): UsePlansManifestResult {
  // Manifest is tiny — synchronous load
  const plans = loadManifest()
  return { plans, isLoading: false }
}
