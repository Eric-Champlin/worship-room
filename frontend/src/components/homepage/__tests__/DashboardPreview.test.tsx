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

  it('each card has id, icon, iconColor, title, and description', () => {
    for (const card of PREVIEW_CARDS) {
      expect(typeof card.id).toBe('string')
      expect(card.id.length).toBeGreaterThan(0)
      expect(card.icon).toBeDefined()
      expect(typeof card.iconColor).toBe('string')
      expect(card.iconColor).toMatch(/^text-/)
      expect(typeof card.title).toBe('string')
      expect(card.title.length).toBeGreaterThan(0)
      expect(typeof card.description).toBe('string')
      expect(card.description.length).toBeGreaterThan(0)
    }
  })

  it('streak card title is pluralized', () => {
    const streakCard = PREVIEW_CARDS.find((c) => c.id === 'streak')
    expect(streakCard?.title).toBe('Streaks & Faith Points')
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
    expect(screen.getByText(/wind down your day with intention/i)).toBeInTheDocument()
  })

  it('renders CTA trust line "It\'s free. No catch."', () => {
    renderDashboardPreview()
    expect(screen.getByText(/it's free\. no catch\./i)).toBeInTheDocument()
  })

  it('renders "Create a Free Account" button', () => {
    renderDashboardPreview()
    expect(
      screen.getByRole('button', { name: /create a free account/i })
    ).toBeInTheDocument()
  })

  it('Create a Free Account button triggers auth modal', async () => {
    const user = userEvent.setup()
    renderDashboardPreview()
    const btn = screen.getByRole('button', { name: /create a free account/i })
    await user.click(btn)
    // Auth modal renders with role="dialog"
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('uses GlowBackground', () => {
    const { container } = renderDashboardPreview()
    expect(container.querySelector('.bg-hero-bg')).toBeInTheDocument()
  })

  it('has primary glow at 0.40 with three-stop gradient', () => {
    const { container } = renderDashboardPreview()
    const glowOrbs = container.querySelectorAll('[aria-hidden="true"]')
    const primaryOrb = Array.from(glowOrbs).find(
      (el) => (el as HTMLElement).style.background?.includes('rgba(139, 92, 246, 0.40)')
    )
    expect(primaryOrb).toBeTruthy()
    expect((primaryOrb as HTMLElement).style.background).toContain('35%')
    expect((primaryOrb as HTMLElement).style.background).toContain('55%')
  })

  it('has secondary glow at 0.25 with lighter violet', () => {
    const { container } = renderDashboardPreview()
    const glowOrbs = container.querySelectorAll('[aria-hidden="true"]')
    const secondaryOrb = Array.from(glowOrbs).find(
      (el) => (el as HTMLElement).style.background?.includes('rgba(168, 130, 255, 0.25)')
    )
    expect(secondaryOrb).toBeTruthy()
  })

  it('has 2 glow orbs', () => {
    const { container } = renderDashboardPreview()
    const glowOrbs = container.querySelectorAll('[aria-hidden="true"]')
    const orbsWithGradient = Array.from(glowOrbs).filter(
      (el) => (el as HTMLElement).style.background?.includes('radial-gradient') && (el as HTMLElement).className.includes('pointer-events-none')
    )
    expect(orbsWithGradient).toHaveLength(2)
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
    const btn = screen.getByRole('button', { name: /create a free account/i })
    expect(btn.className).toContain('w-full')
    expect(btn.className).toContain('sm:w-auto')
  })
})

// --- Card sizing and layout tests ---

describe('card sizing and layout', () => {
  it('grid container has auto-rows-fr', () => {
    const { container } = renderDashboardPreview()
    const grid = container.querySelector('.grid')
    expect(grid?.className).toContain('auto-rows-fr')
  })

  it('each card wrapper has h-full', () => {
    const { container } = renderDashboardPreview()
    const scrollReveals = container.querySelectorAll('.scroll-reveal')
    // Cards are indices 1-6 (0 is heading, 7 is CTA)
    for (let i = 1; i <= 6; i++) {
      expect(scrollReveals[i]?.className).toContain('h-full')
    }
  })

  it('preview content areas have responsive min-height', () => {
    const { container } = renderDashboardPreview()
    const previewAreas = container.querySelectorAll('.relative.bg-white\\/\\[0\\.02\\].min-h-\\[160px\\]')
    expect(previewAreas).toHaveLength(6)
  })

  it('dividers separate preview from text areas', () => {
    const { container } = renderDashboardPreview()
    const dividers = container.querySelectorAll('.border-b.border-white\\/\\[0\\.06\\]')
    expect(dividers).toHaveLength(6)
  })

  it('centered preview cards have items-center', () => {
    const { container } = renderDashboardPreview()
    const centeredWrappers = container.querySelectorAll('.flex.h-full.flex-col.justify-center.items-center')
    expect(centeredWrappers).toHaveLength(4)
  })

  it('left-aligned cards lack items-center on preview wrapper', () => {
    const { container } = renderDashboardPreview()
    // All 6 preview wrappers have justify-center
    const allWrappers = container.querySelectorAll('.flex.h-full.flex-col.justify-center')
    expect(allWrappers).toHaveLength(6)
    // Only 4 have items-center (mood, streak, garden, evening)
    const centeredWrappers = Array.from(allWrappers).filter(
      (el) => el.className.includes('items-center')
    )
    expect(centeredWrappers).toHaveLength(4)
  })

  it('lock overlays are scoped to preview area (not text area)', () => {
    renderDashboardPreview()
    const overlays = screen.getAllByText(/create account to unlock/i)
    for (const overlay of overlays) {
      const overlayContainer = overlay.closest('.absolute.inset-0')
      const previewArea = overlayContainer?.parentElement
      // Preview area should have bg-white/[0.02] (the top zone)
      expect(previewArea?.className).toContain('bg-white/[0.02]')
    }
  })

  it('CTA button has white glow shadow', () => {
    renderDashboardPreview()
    const btn = screen.getByRole('button', { name: /create a free account/i })
    expect(btn.className).toContain('shadow-[0_0_20px')
  })

  it('renders all 6 card descriptions', () => {
    renderDashboardPreview()
    for (const card of PREVIEW_CARDS) {
      expect(screen.getByText(card.description)).toBeInTheDocument()
    }
  })

  it('icon has per-card color class', () => {
    const { container } = renderDashboardPreview()
    const iconColorMap: Record<string, string> = {
      mood: 'text-purple-400',
      streak: 'text-orange-400',
      garden: 'text-emerald-400',
      practices: 'text-purple-400',
      friends: 'text-blue-400',
      evening: 'text-purple-400',
    }
    // Card containers have both bg-white/[0.04] and rounded-2xl
    const cards = container.querySelectorAll('.bg-white\\/\\[0\\.04\\].border')
    expect(cards).toHaveLength(6)
    for (let i = 0; i < PREVIEW_CARDS.length; i++) {
      const textArea = cards[i].querySelector('.p-4')
      const icon = textArea?.querySelector('svg')
      expect(icon?.classList.toString()).toContain(iconColorMap[PREVIEW_CARDS[i].id])
    }
  })

  it('preview area has bg-white/[0.02]', () => {
    const { container } = renderDashboardPreview()
    const previewAreas = container.querySelectorAll('.bg-white\\/\\[0\\.02\\]')
    expect(previewAreas).toHaveLength(6)
  })

  it('cards use bg-white/[0.04] (not FrostedCard bg)', () => {
    const { container } = renderDashboardPreview()
    // Card containers have both bg-white/[0.04] and rounded-2xl
    const cards = container.querySelectorAll('.bg-white\\/\\[0\\.04\\].border')
    expect(cards).toHaveLength(6)
  })

  it('streak card title includes "Streaks" (plural)', () => {
    renderDashboardPreview()
    expect(screen.getByText('Streaks & Faith Points')).toBeInTheDocument()
  })
})
