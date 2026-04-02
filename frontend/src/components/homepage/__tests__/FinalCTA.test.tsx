import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FinalCTA } from '../FinalCTA'

vi.mock('@/hooks/useScrollReveal', () => ({
  useScrollReveal: () => ({ ref: { current: null }, isVisible: true }),
  staggerDelay: (i: number, base = 100, initial = 0) => ({
    transitionDelay: `${initial + i * base}ms`,
  }),
}))

const mockOpenAuthModal = vi.fn()
vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

function renderFinalCTA() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <FinalCTA />
    </MemoryRouter>
  )
}

describe('FinalCTA', () => {
  beforeEach(() => {
    mockOpenAuthModal.mockClear()
  })

  it('renders heading "Your Healing Starts Here"', () => {
    renderFinalCTA()
    expect(
      screen.getByRole('heading', { level: 2, name: /your healing starts here/i })
    ).toBeInTheDocument()
  })

  it('renders subtext', () => {
    renderFinalCTA()
    expect(screen.getByText(/no credit card/i)).toBeInTheDocument()
  })

  it('renders CTA button', () => {
    renderFinalCTA()
    expect(
      screen.getByRole('button', { name: /get started/i })
    ).toBeInTheDocument()
  })

  it('trust line removed', () => {
    renderFinalCTA()
    expect(screen.queryByText(/join thousands/i)).not.toBeInTheDocument()
  })

  it('subtext is exactly "No credit card. No commitment."', () => {
    renderFinalCTA()
    const subtext = screen.getByText(/no credit card/i)
    expect(subtext.textContent?.trim()).toBe('No credit card. No commitment.')
  })

  it('heading renders as 2 lines', () => {
    renderFinalCTA()
    const h2 = screen.getByRole('heading', { level: 2 })
    const spans = h2.querySelectorAll('span')
    expect(spans).toHaveLength(2)
    expect(spans[0]).toHaveTextContent('Your Healing')
    expect(spans[1]).toHaveTextContent('Starts Here')
  })

  it('CTA button opens auth modal', async () => {
    const user = userEvent.setup()
    renderFinalCTA()

    await user.click(screen.getByRole('button', { name: /get started/i }))

    expect(mockOpenAuthModal).toHaveBeenCalledWith(undefined, 'register')
  })

  it('wrapped in GlowBackground', () => {
    const { container } = renderFinalCTA()
    expect(container.querySelector('.bg-hero-bg')).toBeInTheDocument()
  })

  it('has extra glow orb', () => {
    const { container } = renderFinalCTA()
    const glowOrbs = container.querySelectorAll('[aria-hidden="true"]')
    // At least one aria-hidden glow element with radial-gradient
    const hasRadialGradient = Array.from(glowOrbs).some(
      (el) => (el as HTMLElement).style.background?.includes('radial-gradient')
    )
    expect(hasRadialGradient).toBe(true)
  })

  it('stagger delays applied', () => {
    const { container } = renderFinalCTA()
    const scrollRevealEls = container.querySelectorAll('.scroll-reveal')
    const delays = Array.from(scrollRevealEls).map(
      (el) => (el as HTMLElement).style.transitionDelay
    )
    expect(delays).toContain('0ms')
    expect(delays).toContain('150ms')
    expect(delays).toContain('300ms')
  })

  it('all scroll-reveal elements visible', () => {
    const { container } = renderFinalCTA()
    const scrollRevealEls = container.querySelectorAll('.scroll-reveal')
    for (const el of scrollRevealEls) {
      expect(el.classList.contains('is-visible')).toBe(true)
    }
  })

  it('CTA button has type="button"', () => {
    renderFinalCTA()
    const button = screen.getByRole('button', { name: /get started/i })
    expect(button).toHaveAttribute('type', 'button')
  })

  it('glow orb has 0.50 center opacity with three-stop gradient', () => {
    const { container } = renderFinalCTA()
    const glowOrbs = container.querySelectorAll('[aria-hidden="true"]')
    const orb = Array.from(glowOrbs).find(
      (el) => (el as HTMLElement).style.background?.includes('rgba(139, 92, 246, 0.50)')
    )
    expect(orb).toBeTruthy()
    expect((orb as HTMLElement).style.background).toContain('35%')
    expect((orb as HTMLElement).style.background).toContain('55%')
  })

  it('has single glow orb (not 2)', () => {
    const { container } = renderFinalCTA()
    const glowOrbs = container.querySelectorAll('[aria-hidden="true"]')
    const orbsWithGradient = Array.from(glowOrbs).filter(
      (el) => (el as HTMLElement).style.background?.includes('radial-gradient') && (el as HTMLElement).className.includes('pointer-events-none')
    )
    expect(orbsWithGradient).toHaveLength(1)
  })

  it('CTA button has base shadow', () => {
    renderFinalCTA()
    const button = screen.getByRole('button', { name: /get started/i })
    expect(button.className).toContain('shadow-[0_0_30px')
  })

  it('CTA button has hover shadow', () => {
    renderFinalCTA()
    const button = screen.getByRole('button', { name: /get started/i })
    expect(button.className).toContain('hover:shadow-[0_0_40px')
  })

  it('glow orb has pointer-events-none', () => {
    const { container } = renderFinalCTA()
    const glowOrbs = container.querySelectorAll('[aria-hidden="true"]')
    const orb = Array.from(glowOrbs).find(
      (el) => (el as HTMLElement).style.background?.includes('radial-gradient')
    )
    expect(orb?.className).toContain('pointer-events-none')
  })
})
