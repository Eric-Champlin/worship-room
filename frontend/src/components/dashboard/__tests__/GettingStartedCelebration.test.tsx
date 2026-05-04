import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GettingStartedCelebration } from '../GettingStartedCelebration'

beforeEach(() => {
  document.body.style.overflow = ''
})

function renderCelebration(onDismiss = vi.fn()) {
  return { onDismiss, ...render(<GettingStartedCelebration onDismiss={onDismiss} />) }
}

describe('GettingStartedCelebration', () => {
  it('renders heading text', () => {
    renderCelebration()
    expect(
      screen.getByText("You're all set! Welcome to Worship Room."),
    ).toBeInTheDocument()
  })

  it('renders subtext', () => {
    renderCelebration()
    expect(
      screen.getByText(
        "You've explored everything Worship Room has to offer. Your journey starts now.",
      ),
    ).toBeInTheDocument()
  })

  it('renders "Let\'s Go" button', () => {
    renderCelebration()
    expect(screen.getByText("Let's Go")).toBeInTheDocument()
  })

  it('heading uses gradient text treatment', () => {
    renderCelebration()
    const heading = screen.getByText("You're all set! Welcome to Worship Room.")
    expect(heading.className).toContain('bg-clip-text')
    expect(heading.className).toContain('text-transparent')
    expect(heading.className).toContain('from-violet-300')
    expect(heading.className).not.toContain('font-script')
  })

  it('onDismiss called when "Let\'s Go" clicked', () => {
    const onDismiss = vi.fn()
    renderCelebration(onDismiss)
    fireEvent.click(screen.getByText("Let's Go"))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('overlay has role="dialog"', () => {
    renderCelebration()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('overlay has aria-modal="true"', () => {
    renderCelebration()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('confetti particles rendered', () => {
    renderCelebration()
    const particles = document.querySelectorAll('[aria-hidden="true"].animate-confetti-fall')
    expect(particles.length).toBeGreaterThan(0)
  })

  it('Escape key dismisses overlay', () => {
    const onDismiss = vi.fn()
    renderCelebration(onDismiss)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onDismiss).toHaveBeenCalled()
  })

  it('focus trapped in overlay', () => {
    renderCelebration()
    const dialog = screen.getByRole('dialog')
    const focusable = dialog.querySelectorAll('button')
    expect(focusable.length).toBeGreaterThanOrEqual(1)
    // "Let's Go" button should be focused
    expect(document.activeElement?.textContent).toBe("Let's Go")
  })

  it('reduced motion hides confetti', () => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    Object.defineProperty(mql, 'matches', { value: true, writable: true })
    vi.spyOn(window, 'matchMedia').mockReturnValue(mql as MediaQueryList)

    renderCelebration()
    // With reduced motion, confetti should not be rendered (the conditional skips them)
    const particles = document.querySelectorAll('.animate-confetti-fall')
    expect(particles.length).toBe(0)

    vi.restoreAllMocks()
  })
})
