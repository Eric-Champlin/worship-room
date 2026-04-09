import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { usePlansManifest } from '../usePlansManifest'

describe('usePlansManifest', () => {
  it('returns empty array for empty manifest', () => {
    const { result } = renderHook(() => usePlansManifest())
    expect(result.current.plans).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })
})
