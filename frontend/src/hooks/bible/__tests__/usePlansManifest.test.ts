import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { usePlansManifest } from '../usePlansManifest'

describe('usePlansManifest', () => {
  it('returns manifest with psalms-30-days entry', () => {
    const { result } = renderHook(() => usePlansManifest())
    expect(result.current.plans.length).toBeGreaterThanOrEqual(1)
    expect(result.current.isLoading).toBe(false)
    const psalms = result.current.plans.find((p) => p.slug === 'psalms-30-days')
    expect(psalms).toBeDefined()
    expect(psalms!.title).toBe('30 Days in the Psalms')
  })
})
