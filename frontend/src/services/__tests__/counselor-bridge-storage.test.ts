import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  shouldShowCounselorBridge,
  markCounselorBridgeDismissed,
} from '../counselor-bridge-storage'

describe('counselor-bridge-storage (Spec 7.5)', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('shouldShowCounselorBridge returns true when sessionStorage is empty', () => {
    expect(shouldShowCounselorBridge()).toBe(true)
  })

  it('shouldShowCounselorBridge returns false after dismissal', () => {
    markCounselorBridgeDismissed()
    expect(shouldShowCounselorBridge()).toBe(false)
  })

  it('shouldShowCounselorBridge fails open when sessionStorage throws', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('sessionStorage unavailable')
      })
    expect(shouldShowCounselorBridge()).toBe(true)
    expect(spy).toHaveBeenCalledWith('wr_counselor_bridge_dismissed')
  })
})
