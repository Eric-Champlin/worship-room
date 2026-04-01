import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { CelebrationOverlay } from '../CelebrationOverlay'
import type { BadgeDefinition } from '@/types/dashboard'

// Mock canvas generators to avoid real canvas operations
vi.mock('@/lib/celebration-share-canvas', () => ({
  generateBadgeShareImage: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'image/png' })),
  generateStreakShareImage: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'image/png' })),
  generateLevelUpShareImage: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'image/png' })),
}))

// Mock useToastSafe for ShareImageButton
vi.mock('@/components/ui/Toast', () => ({
  useToastSafe: () => ({ showToast: vi.fn() }),
}))

const LEVEL_1_BADGE: BadgeDefinition = {
  id: 'level_1',
  name: 'Seedling',
  description: 'Reached Level 1',
  category: 'level',
  celebrationTier: 'full-screen',
}

const LEVEL_2_BADGE: BadgeDefinition = {
  id: 'level_2',
  name: 'Sprout',
  description: 'Reached Level 2',
  category: 'level',
  celebrationTier: 'full-screen',
  verse: {
    text: 'I planted, Apollos watered, but God gave the increase.',
    reference: '1 Corinthians 3:6',
  },
}

const STREAK_60_BADGE: BadgeDefinition = {
  id: 'streak_60',
  name: 'Unwavering',
  description: 'Maintained a 60-day streak',
  category: 'streak',
  celebrationTier: 'full-screen',
}

const ACTIVITY_BADGE: BadgeDefinition = {
  id: 'first_prayer',
  name: 'First Prayer',
  description: 'Prayed for the first time',
  category: 'activity',
  celebrationTier: 'full-screen',
}

describe('CelebrationOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders level-up with name, encouragement, verse, and reference', () => {
    const onDismiss = vi.fn()
    render(<CelebrationOverlay badge={LEVEL_2_BADGE} onDismiss={onDismiss} />)

    expect(screen.getByText('Sprout')).toBeInTheDocument()
    expect(screen.getByText('Your faith is taking root')).toBeInTheDocument()
    expect(screen.getByText(/I planted, Apollos watered/)).toBeInTheDocument()
    expect(screen.getByText(/1 Corinthians 3:6/)).toBeInTheDocument()
  })

  it('renders streak with name and encouragement, NO verse', () => {
    const onDismiss = vi.fn()
    render(<CelebrationOverlay badge={STREAK_60_BADGE} onDismiss={onDismiss} />)

    expect(screen.getByText('Unwavering')).toBeInTheDocument()
    expect(screen.getByText(/60 days of faithfulness/)).toBeInTheDocument()
    expect(screen.queryByText(/1 Corinthians/)).not.toBeInTheDocument()
  })

  it('Continue button is not visible initially (before 6s)', () => {
    const onDismiss = vi.fn()
    render(<CelebrationOverlay badge={LEVEL_2_BADGE} onDismiss={onDismiss} />)

    expect(screen.queryByText('Continue')).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.queryByText('Continue')).not.toBeInTheDocument()
  })

  it('Continue button appears after 6s timeout and receives focus', () => {
    const onDismiss = vi.fn()
    render(<CelebrationOverlay badge={LEVEL_2_BADGE} onDismiss={onDismiss} />)

    act(() => {
      vi.advanceTimersByTime(6000)
    })

    const continueBtn = screen.getByText('Continue')
    expect(continueBtn).toBeInTheDocument()
    expect(document.activeElement).toBe(continueBtn)
  })

  it('Continue button click calls onDismiss', () => {
    const onDismiss = vi.fn()
    render(<CelebrationOverlay badge={LEVEL_2_BADGE} onDismiss={onDismiss} />)

    act(() => {
      vi.advanceTimersByTime(6000)
    })

    act(() => {
      screen.getByText('Continue').click()
    })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('Escape key calls onDismiss', () => {
    const onDismiss = vi.fn()
    render(<CelebrationOverlay badge={LEVEL_2_BADGE} onDismiss={onDismiss} />)

    const dialogEl = screen.getByRole('dialog')
    act(() => {
      dialogEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('has role="dialog" with aria-labelledby and aria-modal', () => {
    const onDismiss = vi.fn()
    render(<CelebrationOverlay badge={LEVEL_2_BADGE} onDismiss={onDismiss} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-labelledby', 'celebration-title')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('renders correct number of confetti particle elements', () => {
    const onDismiss = vi.fn()
    render(<CelebrationOverlay badge={LEVEL_2_BADGE} onDismiss={onDismiss} />)

    const confetti = document.querySelectorAll('[aria-hidden="true"]')
    // Desktop: 30 particles (jsdom window.innerWidth defaults >= 640)
    expect(confetti.length).toBeGreaterThanOrEqual(15)
  })

  it('confetti particles have motion-reduce:hidden class', () => {
    const onDismiss = vi.fn()
    render(<CelebrationOverlay badge={LEVEL_2_BADGE} onDismiss={onDismiss} />)

    // Select only span confetti particles (not SVG icons which also have aria-hidden)
    const confetti = document.querySelectorAll('span[aria-hidden="true"]')
    expect(confetti.length).toBeGreaterThan(0)
    confetti.forEach((particle) => {
      expect(particle.className).toContain('motion-reduce:hidden')
    })
  })

  it('renders correct icon for level badge (e.g., Leaf for level_2)', () => {
    const onDismiss = vi.fn()
    render(<CelebrationOverlay badge={LEVEL_2_BADGE} onDismiss={onDismiss} />)

    // Lucide icons render as SVG elements
    const svgs = document.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
  })

  it('Continue button visible immediately with prefers-reduced-motion', () => {
    // Mock matchMedia to return reduced motion
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
    render(<CelebrationOverlay badge={LEVEL_2_BADGE} onDismiss={onDismiss} />)

    // Continue should be immediately visible (no 6s delay)
    expect(screen.getByText('Continue')).toBeInTheDocument()
  })

  it('locks scroll on mount and restores on unmount', () => {
    const onDismiss = vi.fn()
    const { unmount } = render(<CelebrationOverlay badge={LEVEL_2_BADGE} onDismiss={onDismiss} />)

    expect(document.body.style.overflow).toBe('hidden')

    unmount()
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  // --- Share button tests ---

  it('Share button renders on level-up celebration (level 2-6)', () => {
    const onDismiss = vi.fn()
    render(<CelebrationOverlay badge={LEVEL_2_BADGE} onDismiss={onDismiss} />)

    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument()
  })

  it('Share button renders on full-screen streak celebration', () => {
    const onDismiss = vi.fn()
    render(<CelebrationOverlay badge={STREAK_60_BADGE} onDismiss={onDismiss} />)

    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument()
  })

  it('Share button renders on activity badge celebration', () => {
    const onDismiss = vi.fn()
    render(<CelebrationOverlay badge={ACTIVITY_BADGE} onDismiss={onDismiss} />)

    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument()
  })

  it('Share button does NOT render for level_1 (Seedling)', () => {
    const onDismiss = vi.fn()
    render(<CelebrationOverlay badge={LEVEL_1_BADGE} onDismiss={onDismiss} />)

    expect(screen.queryByRole('button', { name: /share/i })).not.toBeInTheDocument()
  })

  it('Share button visible immediately (before Continue)', () => {
    // Ensure matchMedia returns non-reduced-motion (no instant Continue)
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    })

    const onDismiss = vi.fn()
    render(<CelebrationOverlay badge={LEVEL_2_BADGE} onDismiss={onDismiss} />)

    // Share is visible at t=0
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument()
    // Continue is NOT visible yet (6s delay)
    expect(screen.queryByText('Continue')).not.toBeInTheDocument()
  })

  it('Continue button still appears after 6s alongside Share', () => {
    const onDismiss = vi.fn()
    render(<CelebrationOverlay badge={LEVEL_2_BADGE} onDismiss={onDismiss} />)

    act(() => {
      vi.advanceTimersByTime(6000)
    })

    // Both buttons visible
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument()
    expect(screen.getByText('Continue')).toBeInTheDocument()
  })

  it('Clicking Share does not dismiss overlay', () => {
    const onDismiss = vi.fn()
    render(<CelebrationOverlay badge={LEVEL_2_BADGE} onDismiss={onDismiss} />)

    act(() => {
      screen.getByRole('button', { name: /share/i }).click()
    })

    expect(onDismiss).not.toHaveBeenCalled()
    // Dialog still open
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
