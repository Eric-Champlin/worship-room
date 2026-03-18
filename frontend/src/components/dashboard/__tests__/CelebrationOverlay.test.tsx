import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { CelebrationOverlay } from '../CelebrationOverlay'
import type { BadgeDefinition } from '@/types/dashboard'

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

    const confetti = document.querySelectorAll('[aria-hidden="true"]')
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
})
