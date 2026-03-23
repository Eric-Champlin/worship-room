import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MilestoneCard } from '../MilestoneCard'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockShowToast = vi.fn()
const mockShowCelebrationToast = vi.fn()
let mockPrefersReduced = false

vi.mock('@/components/ui/Toast', () => ({
  useToastSafe: () => ({
    showToast: mockShowToast,
    showCelebrationToast: mockShowCelebrationToast,
  }),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockPrefersReduced,
}))

vi.mock('@/lib/challenge-share-canvas', () => ({
  generateChallengeShareImage: vi.fn(() => Promise.resolve(new Blob(['test'], { type: 'image/png' }))),
}))

const defaultProps = {
  milestoneTitle: 'Week 1 Complete!',
  challengeTitle: 'Pray40: A Lenten Journey',
  challengeId: 'pray40-lenten-journey',
  themeColor: '#6B21A8',
  currentDay: 7,
  totalDays: 40,
  streak: 7,
  onDismiss: vi.fn(),
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  mockPrefersReduced = false
})

describe('MilestoneCard', () => {
  it('renders milestone title', () => {
    render(<MilestoneCard {...defaultProps} />)
    expect(screen.getByText('Week 1 Complete!')).toBeInTheDocument()
  })

  it('fires confetti celebration toast on mount', () => {
    render(<MilestoneCard {...defaultProps} />)
    expect(mockShowCelebrationToast).toHaveBeenCalledWith('', 'Week 1 Complete!', 'celebration-confetti')
  })

  it('skips confetti with prefers-reduced-motion', () => {
    mockPrefersReduced = true
    render(<MilestoneCard {...defaultProps} />)
    expect(mockShowCelebrationToast).not.toHaveBeenCalled()
  })

  it('"Keep Going" calls onDismiss', () => {
    const onDismiss = vi.fn()
    render(<MilestoneCard {...defaultProps} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByText('Keep Going'))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('share button has descriptive aria-label', () => {
    render(<MilestoneCard {...defaultProps} />)
    expect(
      screen.getByLabelText('Share your Week 1 Complete! milestone for Pray40: A Lenten Journey'),
    ).toBeInTheDocument()
  })

  it('renders "Share Your Milestone" and "Keep Going" buttons', () => {
    render(<MilestoneCard {...defaultProps} />)
    expect(screen.getByText('Share Your Milestone')).toBeInTheDocument()
    expect(screen.getByText('Keep Going')).toBeInTheDocument()
  })

  it('shows "Halfway There!" title for 40-day Day 21', () => {
    render(
      <MilestoneCard
        {...defaultProps}
        milestoneTitle="Halfway There!"
        currentDay={21}
      />,
    )
    expect(screen.getByText('Halfway There!')).toBeInTheDocument()
  })
})
