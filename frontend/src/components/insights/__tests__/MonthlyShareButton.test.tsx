import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MonthlyShareButton } from '../MonthlyShareButton'
import type { MoodEntry } from '@/types/dashboard'

// Mock canvas generator
const mockGenerateMonthlyShareImage = vi.fn().mockResolvedValue(
  new Blob(['test'], { type: 'image/png' }),
)
vi.mock('@/lib/celebration-share-canvas', () => ({
  generateMonthlyShareImage: (...args: unknown[]) => mockGenerateMonthlyShareImage(...args),
}))

// Mock useToastSafe
const mockShowToast = vi.fn()
vi.mock('@/components/ui/Toast', () => ({
  useToastSafe: () => ({ showToast: mockShowToast }),
}))

const baseMoodEntries: MoodEntry[] = [
  { date: '2026-03-01', mood: 4, timestamp: Date.now(), period: 'morning' },
  { date: '2026-03-02', mood: 3, timestamp: Date.now(), period: 'morning' },
  { date: '2026-03-03', mood: 5, timestamp: Date.now(), period: 'morning' },
]

const baseProps = {
  monthName: 'March',
  year: 2026,
  moodEntries: baseMoodEntries,
  activityCounts: { pray: 10, journal: 5, meditate: 0, listen: 3, prayerWall: 2, mood: 15 },
  longestStreak: 7,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGenerateMonthlyShareImage.mockResolvedValue(new Blob(['test'], { type: 'image/png' }))

  // No Web Share or clipboard in tests
  Object.defineProperty(navigator, 'share', { value: undefined, writable: true, configurable: true })
  Object.defineProperty(navigator, 'clipboard', { value: undefined, writable: true, configurable: true })
})

describe('MonthlyShareButton', () => {
  it('renders "Share This Month" button', () => {
    render(<MonthlyShareButton {...baseProps} />)
    expect(screen.getByText('Share This Month')).toBeInTheDocument()
  })

  it('has correct aria-label', () => {
    render(<MonthlyShareButton {...baseProps} />)
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument()
  })

  it('passes correct data to generateMonthlyShareImage', async () => {
    const user = userEvent.setup()
    render(<MonthlyShareButton {...baseProps} />)
    await user.click(screen.getByText('Share This Month'))

    await waitFor(() => {
      expect(mockGenerateMonthlyShareImage).toHaveBeenCalledWith(
        expect.objectContaining({
          monthName: 'March',
          year: 2026,
          moodAvg: 4, // round((4+3+5)/3) = round(4) = 4
          moodLabel: 'Good',
          prayCount: 10,
          journalCount: 5,
          meditateCount: 0,
          listenCount: 3,
          prayerWallCount: 2,
          bestStreak: 7,
        }),
      )
    })
  })

  it('omits zero-value stats (meditateCount=0)', async () => {
    const user = userEvent.setup()
    render(<MonthlyShareButton {...baseProps} />)
    await user.click(screen.getByText('Share This Month'))

    await waitFor(() => {
      const callArgs = mockGenerateMonthlyShareImage.mock.calls[0][0]
      expect(callArgs.meditateCount).toBe(0)
    })
  })

  it('shows at least mood when all activities are zero', async () => {
    const user = userEvent.setup()
    render(
      <MonthlyShareButton
        monthName="March"
        year={2026}
        moodEntries={baseMoodEntries}
        activityCounts={{ mood: 3 }}
        longestStreak={0}
      />,
    )
    await user.click(screen.getByText('Share This Month'))

    await waitFor(() => {
      const callArgs = mockGenerateMonthlyShareImage.mock.calls[0][0]
      expect(callArgs.moodAvg).toBe(4)
      expect(callArgs.moodLabel).toBe('Good')
      expect(callArgs.prayCount).toBe(0)
      expect(callArgs.bestStreak).toBe(0)
    })
  })

  it('button is disabled while generating', async () => {
    let resolveGenerate!: (blob: Blob) => void
    mockGenerateMonthlyShareImage.mockReturnValue(
      new Promise<Blob>((resolve) => {
        resolveGenerate = resolve
      }),
    )

    const user = userEvent.setup()
    render(<MonthlyShareButton {...baseProps} />)
    await user.click(screen.getByText('Share This Month'))

    expect(screen.getByRole('button')).toBeDisabled()

    resolveGenerate(new Blob(['test'], { type: 'image/png' }))
    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled()
    })
  })

  it('shows error toast on canvas failure', async () => {
    mockGenerateMonthlyShareImage.mockRejectedValue(new Error('Canvas failed'))

    const user = userEvent.setup()
    render(<MonthlyShareButton {...baseProps} />)
    await user.click(screen.getByText('Share This Month'))

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith("We couldn't share that. Try again.")
    })
  })
})
