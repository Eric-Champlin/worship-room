import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { DashboardPreview } from '../DashboardPreview'
import { PREVIEW_CARDS, getHeatmapColor, PRACTICES, FRIENDS } from '../dashboard-preview-data'

vi.mock('@/hooks/useScrollReveal', () => ({
  useScrollReveal: () => ({ ref: { current: null }, isVisible: true }),
  staggerDelay: (i: number, base = 100, initial = 0) => ({
    transitionDelay: `${initial + i * base}ms`,
  }),
}))

function renderDashboardPreview() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthModalProvider>
          <DashboardPreview />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}

// --- Data file tests ---

describe('dashboard-preview-data', () => {
  it('PREVIEW_CARDS has 6 items', () => {
    expect(PREVIEW_CARDS).toHaveLength(6)
  })

  it('each card has id, icon, and title', () => {
    for (const card of PREVIEW_CARDS) {
      expect(typeof card.id).toBe('string')
      expect(card.id.length).toBeGreaterThan(0)
      expect(card.icon).toBeDefined()
      expect(typeof card.title).toBe('string')
      expect(card.title.length).toBeGreaterThan(0)
    }
  })

  it('getHeatmapColor is deterministic', () => {
    const first = getHeatmapColor(2, 3)
    const second = getHeatmapColor(2, 3)
    expect(first).toBe(second)
  })

  it('getHeatmapColor returns valid Tailwind classes', () => {
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 7; col++) {
        expect(getHeatmapColor(row, col)).toMatch(/^bg-/)
      }
    }
  })

  it('PRACTICES has 5 items with exactly 2 done', () => {
    expect(PRACTICES).toHaveLength(5)
    expect(PRACTICES.filter((p) => p.done)).toHaveLength(2)
  })

  it('FRIENDS has 3 items with name and color', () => {
    expect(FRIENDS).toHaveLength(3)
    for (const f of FRIENDS) {
      expect(typeof f.name).toBe('string')
      expect(typeof f.color).toBe('string')
      expect(typeof f.streak).toBe('number')
    }
  })
})

// --- Component render tests ---

describe('DashboardPreview', () => {
  it('renders section heading "See What\'s Waiting for You"', () => {
    renderDashboardPreview()
    expect(
      screen.getByRole('heading', { name: /see what's waiting for you/i })
    ).toBeInTheDocument()
  })

  it('renders tagline', () => {
    renderDashboardPreview()
    expect(screen.getByText(/your personal dashboard/i)).toBeInTheDocument()
  })

  it('renders all 6 card titles', () => {
    renderDashboardPreview()
    for (const card of PREVIEW_CARDS) {
      expect(screen.getByText(card.title)).toBeInTheDocument()
    }
  })

  it('section has aria-label', () => {
    renderDashboardPreview()
    expect(
      screen.getByRole('region', { name: /dashboard preview/i })
    ).toBeInTheDocument()
  })

  it('renders 6 lock overlays with "Create account to unlock"', () => {
    renderDashboardPreview()
    expect(screen.getAllByText(/create account to unlock/i)).toHaveLength(6)
  })

  it('renders mood heatmap with 35 squares', () => {
    const { container } = renderDashboardPreview()
    const squares = container.querySelectorAll('.rounded-sm')
    expect(squares).toHaveLength(35)
  })

  it('renders "Last 35 days" label', () => {
    renderDashboardPreview()
    expect(screen.getByText(/last 35 days/i)).toBeInTheDocument()
  })

  it('renders streak "14"', () => {
    renderDashboardPreview()
    expect(screen.getByText('14')).toBeInTheDocument()
  })

  it('renders "day streak" label', () => {
    renderDashboardPreview()
    expect(screen.getByText(/day streak/i)).toBeInTheDocument()
  })

  it('renders "Level 3 · 1,240 pts"', () => {
    renderDashboardPreview()
    expect(screen.getByText(/level 3/i)).toBeInTheDocument()
  })

  it('renders garden SVG', () => {
    const { container } = renderDashboardPreview()
    const svgs = container.querySelectorAll('svg')
    const gardenSvg = Array.from(svgs).find(
      (svg) => svg.getAttribute('viewBox') === '0 0 120 80'
    )
    expect(gardenSvg).toBeTruthy()
  })

  it('renders 5 practice items', () => {
    renderDashboardPreview()
    expect(screen.getByText('Mood Check-in')).toBeInTheDocument()
    expect(screen.getByText('Devotional')).toBeInTheDocument()
    // "Prayer" appears in both practices and evening reflection, so use getAllByText
    expect(screen.getAllByText('Prayer').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Journal')).toBeInTheDocument()
    expect(screen.getByText('Meditation')).toBeInTheDocument()
  })

  it('renders "2 of 5 complete"', () => {
    renderDashboardPreview()
    expect(screen.getByText(/2 of 5 complete/i)).toBeInTheDocument()
  })

  it('renders 3 friend names', () => {
    renderDashboardPreview()
    expect(screen.getByText('Sarah M.')).toBeInTheDocument()
    expect(screen.getByText('David K.')).toBeInTheDocument()
    expect(screen.getByText('Maria L.')).toBeInTheDocument()
  })

  it('renders "3 friends praying with you"', () => {
    renderDashboardPreview()
    expect(screen.getByText(/3 friends praying with you/i)).toBeInTheDocument()
  })

  it('renders evening reflection 4 steps', () => {
    renderDashboardPreview()
    expect(screen.getByText('Mood')).toBeInTheDocument()
    expect(screen.getByText('Highlights')).toBeInTheDocument()
    expect(screen.getByText('Gratitude')).toBeInTheDocument()
    // "Prayer" shared with practices card — verify it appears at least twice
    expect(screen.getAllByText('Prayer')).toHaveLength(2)
  })

  it('renders "Wind down your day with intention"', () => {
    renderDashboardPreview()
    expect(screen.getByText(/wind down your day/i)).toBeInTheDocument()
  })

  it('renders CTA text "All of this is free"', () => {
    renderDashboardPreview()
    expect(screen.getByText(/all of this is free/i)).toBeInTheDocument()
  })

  it('renders "Get Started" button', () => {
    renderDashboardPreview()
    expect(
      screen.getByRole('button', { name: /get started/i })
    ).toBeInTheDocument()
  })

  it('Get Started button triggers auth modal', async () => {
    const user = userEvent.setup()
    renderDashboardPreview()
    const btn = screen.getByRole('button', { name: /get started/i })
    await user.click(btn)
    // Auth modal renders with role="dialog"
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('uses GlowBackground', () => {
    const { container } = renderDashboardPreview()
    expect(container.querySelector('.bg-hero-bg')).toBeInTheDocument()
  })

  it('cards have stagger delay styles', () => {
    const { container } = renderDashboardPreview()
    const cards = container.querySelectorAll('.scroll-reveal')
    // First card wrapper (index 1, heading wrapper is index 0)
    const firstCard = cards[1] as HTMLElement
    expect(firstCard.style.transitionDelay).toBe('200ms')
    // Last card wrapper (index 6)
    const lastCard = cards[6] as HTMLElement
    expect(lastCard.style.transitionDelay).toBe('700ms')
  })

  it('CTA button has full-width mobile class', () => {
    renderDashboardPreview()
    const btn = screen.getByRole('button', { name: /get started/i })
    expect(btn.className).toContain('w-full')
    expect(btn.className).toContain('sm:w-auto')
  })
})
