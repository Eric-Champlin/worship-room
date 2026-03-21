import { describe, it, expect, beforeEach } from 'vitest'
import { getCustomPlanIds, addCustomPlanId } from '../custom-plans-storage'
import { CUSTOM_PLANS_KEY } from '@/constants/reading-plans'

beforeEach(() => {
  localStorage.clear()
})

describe('getCustomPlanIds', () => {
  it('returns empty array by default', () => {
    expect(getCustomPlanIds()).toEqual([])
  })

  it('returns stored plan IDs', () => {
    localStorage.setItem(CUSTOM_PLANS_KEY, JSON.stringify(['plan-a', 'plan-b']))
    expect(getCustomPlanIds()).toEqual(['plan-a', 'plan-b'])
  })

  it('returns empty array for malformed JSON', () => {
    localStorage.setItem(CUSTOM_PLANS_KEY, 'not valid json')
    expect(getCustomPlanIds()).toEqual([])
  })
})

describe('addCustomPlanId', () => {
  it('adds a new plan ID', () => {
    addCustomPlanId('finding-peace-in-anxiety')
    expect(getCustomPlanIds()).toEqual(['finding-peace-in-anxiety'])
  })

  it('deduplicates when adding same ID twice', () => {
    addCustomPlanId('finding-peace-in-anxiety')
    addCustomPlanId('finding-peace-in-anxiety')
    expect(getCustomPlanIds()).toEqual(['finding-peace-in-anxiety'])
  })

  it('adds multiple different IDs', () => {
    addCustomPlanId('finding-peace-in-anxiety')
    addCustomPlanId('walking-through-grief')
    expect(getCustomPlanIds()).toEqual(['finding-peace-in-anxiety', 'walking-through-grief'])
  })
})
