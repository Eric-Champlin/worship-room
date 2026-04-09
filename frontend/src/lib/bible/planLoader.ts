import type { Plan, PlanMetadata } from '@/types/bible-plans'

import manifest from '@/data/bible/plans/manifest.json'

export function loadManifest(): PlanMetadata[] {
  return manifest as PlanMetadata[]
}

export async function loadPlan(
  slug: string,
): Promise<{ plan: Plan | null; error: string | null }> {
  try {
    const mod = await import(`@/data/bible/plans/${slug}.json`)
    const data = mod.default ?? mod
    if (!data.slug || !data.title || !data.duration || !Array.isArray(data.days)) {
      return { plan: null, error: `Plan "${slug}" is missing required fields.` }
    }
    return { plan: data as Plan, error: null }
  } catch {
    return { plan: null, error: `Plan "${slug}" could not be loaded.` }
  }
}
