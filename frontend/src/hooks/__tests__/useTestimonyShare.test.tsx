import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'

import {
  PNG_FILENAME,
  SHARE_FAILURE_TOAST,
  SHARE_WARNING_TITLE,
} from '@/constants/testimony-share-copy'
import type { PrayerRequest } from '@/types/prayer-wall'

// --- Module mocks (hoisted) ---

const showToastSpy = vi.fn()
vi.mock('@/components/ui/Toast', () => ({
  useToastSafe: () => ({
    showToast: showToastSpy,
    showCelebrationToast: vi.fn(),
    dismissToast: vi.fn(),
  }),
}))

const captureSpy = vi.fn(async () => new Blob(['png-bytes'], { type: 'image/png' }))
const sharePngSpy = vi.fn(async () => 'shared')
vi.mock('@/lib/prayer-wall/imageGen', () => ({
  captureDomNodeAsPng: (...args: unknown[]) => captureSpy(...args),
  sharePngOrDownload: (...args: unknown[]) => sharePngSpy(...args),
}))

const updatePrayerWallSpy = vi.fn()
let mockDismissedShareWarning = false
vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    settings: {
      profile: { displayName: '', avatarUrl: null, bio: '' },
      notifications: {},
      privacy: {
        showOnGlobalLeaderboard: true,
        activityStatus: true,
        nudgePermission: 'friends',
        streakVisibility: 'friends',
        blockedUsers: [],
      },
      prayerWall: {
        prayerReceiptsVisible: true,
        nightMode: 'auto',
        watchEnabled: 'off',
        dismissedShareWarning: mockDismissedShareWarning,
      },
    },
    updateProfile: vi.fn(),
    updateNotifications: vi.fn(),
    updatePrivacy: vi.fn(),
    unblockUser: vi.fn(),
    updatePrayerWall: updatePrayerWallSpy,
  }),
}))

import { useTestimonyShare } from '../useTestimonyShare'

// --- Test harness ---

const testimony: PrayerRequest = {
  id: 'p-1',
  userId: 'u-1',
  authorName: 'Sarah',
  authorAvatarUrl: null,
  isAnonymous: false,
  content: 'God restored my marriage.',
  category: 'family',
  postType: 'testimony',
  isAnswered: false,
  answeredText: null,
  answeredAt: null,
  createdAt: '2026-04-29T10:00:00Z',
  lastActivityAt: '2026-04-29T10:00:00Z',
  prayingCount: 5,
  commentCount: 0,
}

function Harness({ prayer }: { prayer: PrayerRequest }) {
  const { initiateShare, portal } = useTestimonyShare(prayer)
  return (
    <>
      <button data-testid="initiate" onClick={initiateShare}>
        initiate
      </button>
      {portal}
    </>
  )
}

describe('useTestimonyShare', () => {
  beforeEach(() => {
    showToastSpy.mockClear()
    captureSpy.mockClear()
    captureSpy.mockImplementation(
      async () => new Blob(['png-bytes'], { type: 'image/png' }),
    )
    sharePngSpy.mockClear()
    sharePngSpy.mockImplementation(async () => 'shared')
    updatePrayerWallSpy.mockClear()
    mockDismissedShareWarning = false
  })

  it('initiateShare opens warning modal when dismissedShareWarning=false', () => {
    mockDismissedShareWarning = false
    render(<Harness prayer={testimony} />)
    fireEvent.click(screen.getByTestId('initiate'))
    expect(screen.getByText(SHARE_WARNING_TITLE)).toBeInTheDocument()
    expect(captureSpy).not.toHaveBeenCalled()
  })

  it('initiateShare SKIPS warning modal when dismissedShareWarning=true', async () => {
    mockDismissedShareWarning = true
    render(<Harness prayer={testimony} />)
    await act(async () => {
      fireEvent.click(screen.getByTestId('initiate'))
    })
    expect(screen.queryByText(SHARE_WARNING_TITLE)).not.toBeInTheDocument()
    await waitFor(() => expect(captureSpy).toHaveBeenCalledTimes(1))
  })

  it('Confirm sets dismissedShareWarning=true and proceeds to share', async () => {
    mockDismissedShareWarning = false
    render(<Harness prayer={testimony} />)
    fireEvent.click(screen.getByTestId('initiate'))
    await act(async () => {
      fireEvent.click(screen.getByTestId('share-warning-confirm'))
    })
    expect(updatePrayerWallSpy).toHaveBeenCalledWith({
      dismissedShareWarning: true,
    })
    await waitFor(() => expect(captureSpy).toHaveBeenCalledTimes(1))
  })

  it('Cancel does NOT share and does NOT set the flag', () => {
    mockDismissedShareWarning = false
    render(<Harness prayer={testimony} />)
    fireEvent.click(screen.getByTestId('initiate'))
    fireEvent.click(screen.getByTestId('share-warning-cancel'))
    expect(updatePrayerWallSpy).not.toHaveBeenCalled()
    expect(captureSpy).not.toHaveBeenCalled()
  })

  it('passes PNG_FILENAME (no userId, no timestamp) to sharePngOrDownload', async () => {
    mockDismissedShareWarning = true
    render(<Harness prayer={testimony} />)
    await act(async () => {
      fireEvent.click(screen.getByTestId('initiate'))
    })
    await waitFor(() => expect(sharePngSpy).toHaveBeenCalledTimes(1))
    expect(sharePngSpy).toHaveBeenCalledWith(expect.any(Blob), PNG_FILENAME)
    expect(PNG_FILENAME).toBe('worship-room-testimony.png')
  })

  it('announces loading state via aria-live while preparing', async () => {
    mockDismissedShareWarning = true
    let resolveCapture: (blob: Blob) => void = () => {}
    captureSpy.mockImplementation(
      () =>
        new Promise<Blob>((resolve) => {
          resolveCapture = resolve
        }),
    )
    render(<Harness prayer={testimony} />)
    await act(async () => {
      fireEvent.click(screen.getByTestId('initiate'))
    })
    // Capture is in-flight — the aria-live announcer should be in the DOM.
    const announcer = screen.getByRole('status')
    expect(announcer).toHaveAttribute('aria-live', 'polite')
    expect(announcer.textContent).toMatch(/preparing your image/i)
    // Resolve so the test cleans up without dangling promises.
    await act(async () => {
      resolveCapture(new Blob(['x'], { type: 'image/png' }))
    })
  })

  it('shows error toast when captureDomNodeAsPng throws', async () => {
    mockDismissedShareWarning = true
    captureSpy.mockImplementation(async () => {
      throw new Error('boom')
    })
    render(<Harness prayer={testimony} />)
    await act(async () => {
      fireEvent.click(screen.getByTestId('initiate'))
    })
    await waitFor(() =>
      expect(showToastSpy).toHaveBeenCalledWith(SHARE_FAILURE_TOAST, 'error'),
    )
  })
})
