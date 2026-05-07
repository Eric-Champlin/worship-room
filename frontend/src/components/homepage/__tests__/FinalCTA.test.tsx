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

  // Glow orb was intentionally removed in commit 585f186
  // ("Remove purple glow orb from FinalCTA section"). GlowBackground is
  // rendered with variant="none", so no radial-gradient orbs should exist.
  it('has no glow orb (removed in 585f186)', () => {
    const { container } = renderFinalCTA()
    const glowOrbs = container.querySelectorAll('[aria-hidden="true"]')
    const hasRadialGradient = Array.from(glowOrbs).some(
      (el) => (el as HTMLElement).style.background?.includes('radial-gradient')
    )
    expect(hasRadialGradient).toBe(false)
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
})

// --- Spec 13 Pattern 2 alignment ---

describe('FinalCTA Pattern 2 alignment (Spec 13)', () => {
  it('CTA has explicit min-h-[44px]', () => {
    renderFinalCTA()
    const btn = screen.getByRole('button', { name: /get started/i })
    expect(btn.className).toContain('min-h-[44px]')
  })

  it('CTA matches canonical Pattern 2 chrome', () => {
    renderFinalCTA()
    const btn = screen.getByRole('button', { name: /get started/i })
    expect(btn.className).toContain('bg-white')
    expect(btn.className).toContain('text-hero-bg')
    expect(btn.className).toContain('inline-flex')
    expect(btn.className).toContain('items-center')
    expect(btn.className).toContain('gap-2')
    expect(btn.className).toContain('shadow-[0_0_30px_rgba(255,255,255,0.20)]')
  })

  it('CTA matches canonical Pattern 2 hover', () => {
    renderFinalCTA()
    const btn = screen.getByRole('button', { name: /get started/i })
    expect(btn.className).toContain('hover:bg-white/90')
    expect(btn.className).toContain('hover:shadow-[0_0_40px_rgba(255,255,255,0.30)]')
  })

  it('CTA uses transition-all duration-200 (not duration-base)', () => {
    renderFinalCTA()
    const btn = screen.getByRole('button', { name: /get started/i })
    expect(btn.className).toContain('transition-all')
    expect(btn.className).toContain('duration-200')
    expect(btn.className).not.toContain('duration-base')
  })

  it('CTA uses canonical white focus ring with ring-offset-hero-bg', () => {
    renderFinalCTA()
    const btn = screen.getByRole('button', { name: /get started/i })
    expect(btn.className).toContain('focus-visible:ring-white/50')
    expect(btn.className).toContain('focus-visible:ring-offset-hero-bg')
    expect(btn.className).not.toContain('focus-visible:ring-primary')
  })

  it('CTA padding is Pattern 2 canonical (px-8 py-3.5)', () => {
    renderFinalCTA()
    const btn = screen.getByRole('button', { name: /get started/i })
    expect(btn.className).toContain('px-8')
    expect(btn.className).toContain('py-3.5')
  })
})
