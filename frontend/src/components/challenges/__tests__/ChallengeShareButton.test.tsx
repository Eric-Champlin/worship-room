import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChallengeShareButton } from '../ChallengeShareButton'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockShowToast = vi.fn()

vi.mock('@/components/ui/Toast', () => ({
  useToastSafe: () => ({
    showToast: mockShowToast,
    showCelebrationToast: vi.fn(),
  }),
}))

vi.mock('@/lib/challenge-share-canvas', () => ({
  generateChallengeShareImage: vi.fn(() => Promise.resolve(new Blob(['test'], { type: 'image/png' }))),
}))

const defaultProps = {
  challengeTitle: 'Pray40: A Lenten Journey',
  challengeId: 'pray40-lenten-journey',
  themeColor: '#6B21A8',
  currentDay: 10,
  totalDays: 40,
  streak: 5,
  completedDaysCount: 9,
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ChallengeShareButton', () => {
  it('renders share button when user has completed days', () => {
    render(<ChallengeShareButton {...defaultProps} />)
    expect(screen.getByText('Share Progress')).toBeInTheDocument()
    expect(screen.getByText('Copy text')).toBeInTheDocument()
  })

  it('does not render when no completed days', () => {
    const { container } = render(
      <ChallengeShareButton {...defaultProps} completedDaysCount={0} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('"Copy text" copies correct text to clipboard', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.assign(navigator, { clipboard: { writeText } })

    render(<ChallengeShareButton {...defaultProps} />)
    fireEvent.click(screen.getByText('Copy text'))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        "I'm on Day 10 of Pray40: A Lenten Journey on Worship Room! Join me: /challenges/pray40-lenten-journey",
      )
    })
  })

  it('shows "Copied!" toast after clipboard copy', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.assign(navigator, { clipboard: { writeText } })

    render(<ChallengeShareButton {...defaultProps} />)
    fireEvent.click(screen.getByText('Copy text'))

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Copied — ready to share.')
    })
  })

  it('uses download fallback when Web Share not available', async () => {
    // Ensure navigator.share is undefined
    Object.defineProperty(navigator, 'share', { value: undefined, writable: true })

    const createObjectURL = vi.fn(() => 'blob:test')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, writable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, writable: true })

    const appendSpy = vi.spyOn(document.body, 'appendChild')
    const removeSpy = vi.spyOn(document.body, 'removeChild')

    render(<ChallengeShareButton {...defaultProps} />)
    fireEvent.click(screen.getByText('Share Progress'))

    await waitFor(() => {
      expect(createObjectURL).toHaveBeenCalled()
      expect(appendSpy).toHaveBeenCalled()
      expect(removeSpy).toHaveBeenCalled()
    })

    appendSpy.mockRestore()
    removeSpy.mockRestore()
  })

  it('share button has descriptive aria-label', () => {
    render(<ChallengeShareButton {...defaultProps} />)
    expect(
      screen.getByLabelText('Share your progress for Pray40: A Lenten Journey'),
    ).toBeInTheDocument()
  })

  it('copy button has descriptive aria-label', () => {
    render(<ChallengeShareButton {...defaultProps} />)
    expect(
      screen.getByLabelText('Copy share text to clipboard'),
    ).toBeInTheDocument()
  })
})
