import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useShareMix } from '../useShareMix'

// ── Mocks ────────────────────────────────────────────────────────────

const mockShowToast = vi.fn()

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}))

// ── Tests ────────────────────────────────────────────────────────────

describe('useShareMix', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: no navigator.share, clipboard available
    vi.stubGlobal('navigator', {
      ...navigator,
      share: undefined,
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('shareMix encodes sounds correctly', async () => {
    const { result } = renderHook(() => useShareMix())

    await act(async () => {
      await result.current.shareMix([
        { soundId: 'gentle-rain', volume: 0.7 },
      ])
    })

    // Should have called clipboard.writeText with a URL
    const url = vi.mocked(navigator.clipboard.writeText).mock.calls[0][0]
    expect(url).toContain('/music?tab=ambient&mix=')
  })

  it('shareMix calls navigator.clipboard.writeText', async () => {
    const { result } = renderHook(() => useShareMix())

    await act(async () => {
      await result.current.shareMix([
        { soundId: 'gentle-rain', volume: 0.7 },
      ])
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalled()
    expect(mockShowToast).toHaveBeenCalledWith('Mix link copied!')
  })
})
