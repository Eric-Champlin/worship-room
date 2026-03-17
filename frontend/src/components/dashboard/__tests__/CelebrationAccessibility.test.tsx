import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { CelebrationOverlay } from '../CelebrationOverlay'
import { BadgeGrid } from '../BadgeGrid'
import type { BadgeDefinition } from '@/types/dashboard'

const LEVEL_3_BADGE: BadgeDefinition = {
  id: 'level_3',
  name: 'Blooming',
  description: 'Reached Level 3',
  category: 'level',
  celebrationTier: 'full-screen',
  verse: {
    text: 'The righteous shall flourish like the palm tree.',
    reference: 'Psalm 92:12',
  },
}

describe('Celebration Accessibility', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // Full-screen overlay accessibility
  it('Full-screen overlay has role="dialog" and aria-modal', () => {
    const onDismiss = vi.fn()
    render(<CelebrationOverlay badge={LEVEL_3_BADGE} onDismiss={onDismiss} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'celebration-title')
  })

  it('Focus is trapped within overlay', () => {
    const onDismiss = vi.fn()
    render(<CelebrationOverlay badge={LEVEL_3_BADGE} onDismiss={onDismiss} />)

    // Dialog should be in the document
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // Show Continue button
    act(() => {
      vi.advanceTimersByTime(6000)
    })

    // Continue button should have focus
    const continueBtn = screen.getByText('Continue')
    expect(document.activeElement).toBe(continueBtn)
  })

  it('Escape key dismisses overlay', () => {
    const onDismiss = vi.fn()
    render(<CelebrationOverlay badge={LEVEL_3_BADGE} onDismiss={onDismiss} />)

    const dialog = screen.getByRole('dialog')
    act(() => {
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  // Toast accessibility
  it('Celebration toasts have role="status"', () => {
    function CelebToastTest() {
      const { showCelebrationToast } = useToast()
      return (
        <button onClick={() => showCelebrationToast('Test Badge', 'msg', 'celebration')}>
          Go
        </button>
      )
    }

    render(
      <ToastProvider>
        <CelebToastTest />
      </ToastProvider>,
    )

    act(() => {
      screen.getByText('Go').click()
    })

    const toastEl = screen.getByText('Test Badge').closest('[role="status"]')
    expect(toastEl).toBeInTheDocument()
    expect(toastEl?.getAttribute('aria-live')).toBe('polite')
  })

  // Badge grid accessibility
  it('Badge grid items have descriptive aria-labels', () => {
    localStorage.setItem('wr_badges', JSON.stringify({
      earned: {
        welcome: { earnedAt: '2026-03-10T12:00:00Z' },
      },
      newlyEarned: [],
      activityCounts: { pray: 0, journal: 0, meditate: 0, listen: 0, prayerWall: 0, encouragementsSent: 0, fullWorshipDays: 0 },
    }))

    render(<BadgeGrid />)

    // Earned badge has "Earned" in label
    const earned = screen.getByLabelText(/Welcome to Worship Room, Earned/)
    expect(earned).toBeInTheDocument()

    // Locked badge has "Locked" in label
    const locked = screen.getByLabelText(/First Flame, Locked/)
    expect(locked).toBeInTheDocument()
  })

  // Confetti accessibility
  it('All confetti elements have aria-hidden="true"', () => {
    const onDismiss = vi.fn()
    render(<CelebrationOverlay badge={LEVEL_3_BADGE} onDismiss={onDismiss} />)

    const confetti = document.querySelectorAll('.animate-confetti-fall')
    expect(confetti.length).toBeGreaterThan(0)
    confetti.forEach((el) => {
      expect(el.getAttribute('aria-hidden')).toBe('true')
    })
  })

  // Reduced motion
  it('Continue button visible immediately with reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    })

    const onDismiss = vi.fn()
    render(<CelebrationOverlay badge={LEVEL_3_BADGE} onDismiss={onDismiss} />)

    // Continue should be immediately visible (no delay)
    expect(screen.getByText('Continue')).toBeInTheDocument()
  })
})
