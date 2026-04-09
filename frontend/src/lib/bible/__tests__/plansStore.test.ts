import { beforeEach, describe, expect, it, vi } from 'vitest'

// Dynamic import for fresh module per test
async function loadStore() {
  return await import('../plansStore')
}

describe('plansStore', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('getPlansState returns default when empty', async () => {
    const { getPlansState } = await loadStore()
    const state = getPlansState()
    expect(state.activePlanSlug).toBeNull()
    expect(state.plans).toEqual({})
  })

  it('startPlan creates progress record', async () => {
    const { startPlan, getPlansState } = await loadStore()
    startPlan('psalm-comfort', 21, 'Psalms of Comfort', 'Psalm 23')

    const state = getPlansState()
    expect(state.activePlanSlug).toBe('psalm-comfort')

    const progress = state.plans['psalm-comfort']
    expect(progress).toBeDefined()
    expect(progress.currentDay).toBe(1)
    expect(progress.completedDays).toEqual([])
    expect(progress.completedAt).toBeNull()
    expect(progress.pausedAt).toBeNull()
    expect(progress.reflection).toBeNull()
    expect(progress.celebrationShown).toBe(false)
    expect(progress.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('startPlan pauses previous active plan', async () => {
    const { startPlan, getPlansState } = await loadStore()
    startPlan('plan-a', 10, 'Plan A', 'Gen 1')
    startPlan('plan-b', 14, 'Plan B', 'John 1')

    const state = getPlansState()
    expect(state.activePlanSlug).toBe('plan-b')
    expect(state.plans['plan-a'].pausedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(state.plans['plan-b'].pausedAt).toBeNull()
  })

  it('markDayComplete adds to completedDays', async () => {
    const { startPlan, markDayComplete, getPlansState } = await loadStore()
    startPlan('test', 10, 'Test', 'Gen 1')

    const result = markDayComplete('test', 1, 10)
    expect(result.type).toBe('day-completed')

    const state = getPlansState()
    expect(state.plans['test'].completedDays).toEqual([1])
    expect(state.plans['test'].currentDay).toBe(2)
  })

  it('markDayComplete is idempotent', async () => {
    const { startPlan, markDayComplete, getPlansState } = await loadStore()
    startPlan('test', 10, 'Test', 'Gen 1')

    markDayComplete('test', 1, 10)
    const result = markDayComplete('test', 1, 10)

    expect(result.type).toBe('already-completed')
    expect(getPlansState().plans['test'].completedDays).toEqual([1])
  })

  it('markDayComplete out-of-order keeps currentDay at earliest uncompleted', async () => {
    const { startPlan, markDayComplete, getPlansState } = await loadStore()
    startPlan('test', 10, 'Test', 'Gen 1')

    markDayComplete('test', 3, 10)
    const state = getPlansState()
    expect(state.plans['test'].currentDay).toBe(1) // day 1 still uncompleted
    expect(state.plans['test'].completedDays).toEqual([3])
  })

  it('markDayComplete final day triggers completion', async () => {
    const { startPlan, markDayComplete, getPlansState } = await loadStore()
    startPlan('test', 3, 'Test', 'Gen 1')

    markDayComplete('test', 1, 3)
    markDayComplete('test', 2, 3)
    const result = markDayComplete('test', 3, 3)

    expect(result.type).toBe('plan-completed')
    expect(result.isAllComplete).toBe(true)

    const state = getPlansState()
    expect(state.plans['test'].completedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(state.activePlanSlug).toBeNull()
    // celebrationShown remains false — UI sets it after showing overlay
    expect(state.plans['test'].celebrationShown).toBe(false)
  })

  it('pausePlan sets pausedAt', async () => {
    const { startPlan, pausePlan, getPlansState } = await loadStore()
    startPlan('test', 10, 'Test', 'Gen 1')
    pausePlan('test')

    const state = getPlansState()
    expect(state.plans['test'].pausedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('resumePlan clears pausedAt and sets active', async () => {
    const { startPlan, pausePlan, resumePlan, getPlansState } = await loadStore()
    startPlan('test', 10, 'Test', 'Gen 1')
    pausePlan('test')
    resumePlan('test')

    const state = getPlansState()
    expect(state.plans['test'].pausedAt).toBeNull()
    expect(state.activePlanSlug).toBe('test')
  })

  it('resumePlan pauses currently active plan', async () => {
    const { startPlan, pausePlan, resumePlan, getPlansState } = await loadStore()
    startPlan('plan-a', 10, 'A', 'Gen 1')
    pausePlan('plan-a')
    startPlan('plan-b', 14, 'B', 'John 1')

    resumePlan('plan-a')

    const state = getPlansState()
    expect(state.activePlanSlug).toBe('plan-a')
    expect(state.plans['plan-a'].pausedAt).toBeNull()
    expect(state.plans['plan-b'].pausedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('restartPlan resets progress', async () => {
    const { startPlan, markDayComplete, restartPlan, getPlansState } = await loadStore()
    startPlan('test', 3, 'Test', 'Gen 1')
    markDayComplete('test', 1, 3)
    markDayComplete('test', 2, 3)
    markDayComplete('test', 3, 3)

    restartPlan('test', 3, 'Test', 'Gen 1')

    const state = getPlansState()
    expect(state.plans['test'].completedDays).toEqual([])
    expect(state.plans['test'].completedAt).toBeNull()
    expect(state.plans['test'].currentDay).toBe(1)
    expect(state.plans['test'].celebrationShown).toBe(false)
    expect(state.activePlanSlug).toBe('test')
  })

  it('saveReflection writes to progress', async () => {
    const { startPlan, saveReflection, getPlansState } = await loadStore()
    startPlan('test', 10, 'Test', 'Gen 1')
    saveReflection('test', 'This plan was deeply meaningful.')

    expect(getPlansState().plans['test'].reflection).toBe('This plan was deeply meaningful.')
  })

  it('setCelebrationShown flips flag', async () => {
    const { startPlan, setCelebrationShown, getPlansState } = await loadStore()
    startPlan('test', 10, 'Test', 'Gen 1')

    expect(getPlansState().plans['test'].celebrationShown).toBe(false)
    setCelebrationShown('test')
    expect(getPlansState().plans['test'].celebrationShown).toBe(true)
  })

  it('subscribe notifies on state change', async () => {
    const { startPlan, subscribe } = await loadStore()
    const listener = vi.fn()
    subscribe(listener)

    startPlan('test', 10, 'Test', 'Gen 1')
    expect(listener).toHaveBeenCalled()
  })

  it('SSR safety returns defaults', async () => {
    const origWindow = globalThis.window
    // @ts-expect-error — simulating SSR
    delete globalThis.window
    try {
      const { getPlansState } = await loadStore()
      const state = getPlansState()
      expect(state.activePlanSlug).toBeNull()
      expect(state.plans).toEqual({})
    } finally {
      globalThis.window = origWindow
    }
  })

  it('bridge: active plan writes single-element array', async () => {
    const { startPlan } = await loadStore()
    startPlan('psalm-comfort', 21, 'Psalms of Comfort', 'Psalm 23')

    const bridge = JSON.parse(localStorage.getItem('wr_bible_active_plans') ?? '[]')
    expect(bridge).toHaveLength(1)
    expect(bridge[0].planId).toBe('psalm-comfort')
  })

  it('bridge: null activePlanSlug writes empty array', async () => {
    const { startPlan, markDayComplete } = await loadStore()
    startPlan('test', 2, 'Test', 'Gen 1')
    markDayComplete('test', 1, 2)
    markDayComplete('test', 2, 2)

    const bridge = JSON.parse(localStorage.getItem('wr_bible_active_plans') ?? '[]')
    expect(bridge).toEqual([])
  })

  it('bridge: switching plans reflects only the new plan', async () => {
    const { startPlan } = await loadStore()
    startPlan('plan-a', 10, 'A', 'Gen 1')
    startPlan('plan-b', 14, 'B', 'John 1')

    const bridge = JSON.parse(localStorage.getItem('wr_bible_active_plans') ?? '[]')
    expect(bridge).toHaveLength(1)
    expect(bridge[0].planId).toBe('plan-b')
  })

  // --- replaceAllPlans ---

  it('replaceAllPlans overwrites entire store', async () => {
    const { startPlan, replaceAllPlans, getPlansState } = await loadStore()
    startPlan('old-plan', 7, 'Old', 'Gen 1')

    const incoming = {
      activePlanSlug: 'new-plan',
      plans: {
        'new-plan': {
          slug: 'new-plan',
          startedAt: '2026-04-05',
          currentDay: 3,
          completedDays: [1, 2],
          completedAt: null,
          pausedAt: null,
          resumeFromDay: null,
          reflection: null,
          celebrationShown: false,
        },
      },
    }
    const result = replaceAllPlans(incoming)
    expect(result).toEqual({ added: 1, updated: 0, skipped: 0 })

    const state = getPlansState()
    expect(state.activePlanSlug).toBe('new-plan')
    expect(state.plans['old-plan']).toBeUndefined()
    expect(state.plans['new-plan'].currentDay).toBe(3)
  })

  // --- mergeInPlans ---

  it('mergeInPlans adds new plans', async () => {
    const { startPlan, mergeInPlans, getPlansState } = await loadStore()
    startPlan('existing', 7, 'Existing', 'Gen 1')

    const incoming = {
      activePlanSlug: null,
      plans: {
        'new-plan': {
          slug: 'new-plan',
          startedAt: '2026-04-05',
          currentDay: 1,
          completedDays: [],
          completedAt: null,
          pausedAt: null,
          resumeFromDay: null,
          reflection: null,
          celebrationShown: false,
        },
      },
    }
    const result = mergeInPlans(incoming)
    expect(result).toEqual({ added: 1, updated: 0, skipped: 0 })

    const state = getPlansState()
    expect(state.plans['existing']).toBeDefined()
    expect(state.plans['new-plan']).toBeDefined()
  })

  it('mergeInPlans keeps version with more completed days', async () => {
    const { startPlan, markDayComplete, mergeInPlans, getPlansState } = await loadStore()
    startPlan('shared', 10, 'Shared', 'Gen 1')
    markDayComplete('shared', 1, 10)

    const incoming = {
      activePlanSlug: null,
      plans: {
        shared: {
          slug: 'shared',
          startedAt: '2026-04-01',
          currentDay: 4,
          completedDays: [1, 2, 3],
          completedAt: null,
          pausedAt: null,
          resumeFromDay: null,
          reflection: null,
          celebrationShown: false,
        },
      },
    }
    const result = mergeInPlans(incoming)
    expect(result).toEqual({ added: 0, updated: 1, skipped: 0 })

    const state = getPlansState()
    expect(state.plans['shared'].completedDays).toEqual([1, 2, 3])
  })

  it('mergeInPlans skips when existing has more progress', async () => {
    const { startPlan, markDayComplete, mergeInPlans, getPlansState } = await loadStore()
    startPlan('shared', 10, 'Shared', 'Gen 1')
    markDayComplete('shared', 1, 10)
    markDayComplete('shared', 2, 10)
    markDayComplete('shared', 3, 10)

    const incoming = {
      activePlanSlug: null,
      plans: {
        shared: {
          slug: 'shared',
          startedAt: '2026-04-01',
          currentDay: 2,
          completedDays: [1],
          completedAt: null,
          pausedAt: null,
          resumeFromDay: null,
          reflection: null,
          celebrationShown: false,
        },
      },
    }
    const result = mergeInPlans(incoming)
    expect(result).toEqual({ added: 0, updated: 0, skipped: 1 })

    const state = getPlansState()
    expect(state.plans['shared'].completedDays).toEqual([1, 2, 3])
  })

  it('mergeInPlans preserves active plan from incoming when current has none', async () => {
    const { mergeInPlans, getPlansState } = await loadStore()
    const incoming = {
      activePlanSlug: 'imported-plan',
      plans: {
        'imported-plan': {
          slug: 'imported-plan',
          startedAt: '2026-04-01',
          currentDay: 1,
          completedDays: [],
          completedAt: null,
          pausedAt: null,
          resumeFromDay: null,
          reflection: null,
          celebrationShown: false,
        },
      },
    }
    mergeInPlans(incoming)
    expect(getPlansState().activePlanSlug).toBe('imported-plan')
  })

  it('handles corrupt localStorage gracefully', async () => {
    localStorage.setItem('bible:plans', 'not-json')
    const { getPlansState } = await loadStore()
    const state = getPlansState()
    expect(state.activePlanSlug).toBeNull()
    expect(state.plans).toEqual({})
  })
})
