import { CUSTOM_PLANS_KEY } from '@/constants/reading-plans'

export function getCustomPlanIds(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PLANS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (_e) {
    // localStorage may be unavailable or data malformed
    return []
  }
}

export function addCustomPlanId(planId: string): void {
  const existing = getCustomPlanIds()
  if (!existing.includes(planId)) {
    existing.push(planId)
    localStorage.setItem(CUSTOM_PLANS_KEY, JSON.stringify(existing))
  }
}
