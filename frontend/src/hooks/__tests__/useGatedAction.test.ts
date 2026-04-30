import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const gateMock = {
  isStaleAcceptance: false,
  queueAndShow: vi.fn(),
}

vi.mock('@/components/legal/LegalVersionGate', () => ({
  useLegalVersionGate: () => gateMock,
  useLegalVersionGateOptional: () => gateMock,
}))

import { useGatedAction } from '../useGatedAction'

describe('useGatedAction', () => {
  beforeEach(() => {
    gateMock.isStaleAcceptance = false
    gateMock.queueAndShow.mockReset()
  })

  it('fires action when versions current', () => {
    const action = vi.fn()
    const { result } = renderHook(() => useGatedAction(action))

    act(() => {
      result.current('arg1', 42)
    })

    expect(action).toHaveBeenCalledWith('arg1', 42)
    expect(gateMock.queueAndShow).not.toHaveBeenCalled()
  })

  it('blocks action and queues when stale', () => {
    gateMock.isStaleAcceptance = true
    const action = vi.fn()
    const { result } = renderHook(() => useGatedAction(action))

    act(() => {
      result.current('arg1', 42)
    })

    expect(action).not.toHaveBeenCalled()
    expect(gateMock.queueAndShow).toHaveBeenCalledTimes(1)
    // The queued callback closes over args; invoking it fires the original action.
    const queued = gateMock.queueAndShow.mock.calls[0][0]
    queued()
    expect(action).toHaveBeenCalledWith('arg1', 42)
  })
})
