import { BIBLE_PLANS_KEY } from '@/constants/bible'
import type { ActivePlan } from '@/types/bible-landing'
import type { PlanCompletionResult, PlanProgress, PlansStoreState } from '@/types/bible-plans'

import { getTodayLocal } from './dateUtils'

// --- Module-level state ---
let cache: PlansStoreState | null = null
const listeners = new Set<() => void>()

const DEFAULT_STATE: PlansStoreState = { activePlanSlug: null, plans: {} }

// --- Storage I/O ---
function readFromStorage(): PlansStoreState {
  if (typeof window === 'undefined') return { ...DEFAULT_STATE, plans: {} }

  try {
    const raw = localStorage.getItem(BIBLE_PLANS_KEY)
    if (raw) {
      return JSON.parse(raw) as PlansStoreState
    }
    return { ...DEFAULT_STATE, plans: {} }
  } catch {
    return { ...DEFAULT_STATE, plans: {} }
  }
}

function writeToStorage(data: PlansStoreState): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(BIBLE_PLANS_KEY, JSON.stringify(data))
  } catch {
    // Silent fail — localStorage unavailable or quota exceeded
  }
}

function getCache(): PlansStoreState {
  if (cache === null) {
    cache = readFromStorage()
  }
  return cache
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener()
  }
}

function persist(state: PlansStoreState): void {
  writeToStorage(state)
  writeBridge(state)
}

function writeBridge(state: PlansStoreState): void {
  if (typeof window === 'undefined') return

  try {
    if (!state.activePlanSlug) {
      localStorage.setItem('wr_bible_active_plans', '[]')
      return
    }
    const progress = state.plans[state.activePlanSlug]
    if (!progress) {
      localStorage.setItem('wr_bible_active_plans', '[]')
      return
    }
    // Write minimal bridge — the hook fills in totalDays, planName, todayReading
    const bridge: ActivePlan[] = [
      {
        planId: progress.slug,
        currentDay: progress.currentDay,
        totalDays: 0,
        planName: '',
        todayReading: '',
        startedAt: new Date(progress.startedAt).getTime(),
      },
    ]
    localStorage.setItem('wr_bible_active_plans', JSON.stringify(bridge))
  } catch {
    // Silent fail
  }
}

function recalcCurrentDay(completedDays: number[], totalDays: number): number {
  for (let d = 1; d <= totalDays; d++) {
    if (!completedDays.includes(d)) return d
  }
  return totalDays // all complete
}

// --- Read API ---
export function getPlansState(): PlansStoreState {
  const state = getCache()
  return { activePlanSlug: state.activePlanSlug, plans: { ...state.plans } }
}

export function getActivePlanProgress(): PlanProgress | null {
  const state = getCache()
  if (!state.activePlanSlug) return null
  return state.plans[state.activePlanSlug] ?? null
}

export function getPlanProgress(slug: string): PlanProgress | null {
  const state = getCache()
  return state.plans[slug] ?? null
}

// --- Write API ---
export function startPlan(
  slug: string,
  _totalDays: number,
  _planName: string,
  _todayReading: string,
): void {
  const state = getCache()
  const today = getTodayLocal()

  // Pause previous active plan if any
  if (state.activePlanSlug && state.activePlanSlug !== slug && state.plans[state.activePlanSlug]) {
    state.plans[state.activePlanSlug] = {
      ...state.plans[state.activePlanSlug],
      pausedAt: today,
    }
  }

  state.plans[slug] = {
    slug,
    startedAt: today,
    currentDay: 1,
    completedDays: [],
    completedAt: null,
    pausedAt: null,
    resumeFromDay: null,
    reflection: null,
    celebrationShown: false,
  }
  state.activePlanSlug = slug

  cache = state
  persist(state)
  notifyListeners()
}

export function markDayComplete(
  slug: string,
  day: number,
  totalDays: number,
): PlanCompletionResult {
  const state = getCache()
  const progress = state.plans[slug]
  if (!progress) {
    return { type: 'already-completed', day }
  }

  // Idempotent — already completed this day
  if (progress.completedDays.includes(day)) {
    return { type: 'already-completed', day }
  }

  const updatedDays = [...progress.completedDays, day]
  const allComplete = updatedDays.length >= totalDays

  state.plans[slug] = {
    ...progress,
    completedDays: updatedDays,
    currentDay: allComplete ? totalDays : recalcCurrentDay(updatedDays, totalDays),
    completedAt: allComplete ? getTodayLocal() : progress.completedAt,
  }

  if (allComplete) {
    state.activePlanSlug = state.activePlanSlug === slug ? null : state.activePlanSlug
  }

  cache = state
  persist(state)
  notifyListeners()

  if (allComplete) {
    return { type: 'plan-completed', day, isAllComplete: true }
  }
  return { type: 'day-completed', day, isAllComplete: false }
}

export function pausePlan(slug: string): void {
  const state = getCache()
  const progress = state.plans[slug]
  if (!progress) return

  state.plans[slug] = {
    ...progress,
    pausedAt: getTodayLocal(),
  }

  cache = state
  persist(state)
  notifyListeners()
}

export function resumePlan(slug: string): void {
  const state = getCache()
  const progress = state.plans[slug]
  if (!progress) return

  const today = getTodayLocal()

  // Pause currently active plan if different
  if (state.activePlanSlug && state.activePlanSlug !== slug && state.plans[state.activePlanSlug]) {
    state.plans[state.activePlanSlug] = {
      ...state.plans[state.activePlanSlug],
      pausedAt: today,
    }
  }

  state.plans[slug] = {
    ...progress,
    pausedAt: null,
  }
  state.activePlanSlug = slug

  cache = state
  persist(state)
  notifyListeners()
}

export function restartPlan(
  slug: string,
  _totalDays: number,
  _planName: string,
  _todayReading: string,
): void {
  const state = getCache()
  const today = getTodayLocal()

  state.plans[slug] = {
    slug,
    startedAt: today,
    currentDay: 1,
    completedDays: [],
    completedAt: null,
    pausedAt: null,
    resumeFromDay: null,
    reflection: null,
    celebrationShown: false,
  }
  state.activePlanSlug = slug

  cache = state
  persist(state)
  notifyListeners()
}

export function saveReflection(slug: string, text: string): void {
  const state = getCache()
  const progress = state.plans[slug]
  if (!progress) return

  state.plans[slug] = {
    ...progress,
    reflection: text,
  }

  cache = state
  persist(state)
  notifyListeners()
}

export function setCelebrationShown(slug: string): void {
  const state = getCache()
  const progress = state.plans[slug]
  if (!progress) return

  state.plans[slug] = {
    ...progress,
    celebrationShown: true,
  }

  cache = state
  persist(state)
  notifyListeners()
}

// --- Import/Export support (Step 10) ---
export function replaceAllPlans(incoming: PlansStoreState): { added: number; updated: number; skipped: number } {
  cache = { ...incoming }
  persist(cache)
  notifyListeners()
  const totalPlans = Object.keys(incoming.plans).length
  return { added: totalPlans, updated: 0, skipped: 0 }
}

export function mergeInPlans(incoming: PlansStoreState): { added: number; updated: number; skipped: number } {
  const current = getCache()
  let added = 0
  let updated = 0
  let skipped = 0

  for (const [slug, incomingProgress] of Object.entries(incoming.plans)) {
    const existing = current.plans[slug]
    if (!existing) {
      current.plans[slug] = incomingProgress
      added++
    } else if (incomingProgress.completedDays.length > existing.completedDays.length) {
      current.plans[slug] = incomingProgress
      updated++
    } else if (
      incomingProgress.completedAt &&
      existing.completedAt &&
      incomingProgress.completedAt > existing.completedAt
    ) {
      current.plans[slug] = incomingProgress
      updated++
    } else {
      skipped++
    }
  }

  // Preserve active plan from incoming if current has none
  if (!current.activePlanSlug && incoming.activePlanSlug) {
    current.activePlanSlug = incoming.activePlanSlug
  }

  cache = current
  persist(current)
  notifyListeners()
  return { added, updated, skipped }
}

// --- Subscription ---
export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// --- Test helper ---
export function _resetForTesting(): void {
  cache = null
}
