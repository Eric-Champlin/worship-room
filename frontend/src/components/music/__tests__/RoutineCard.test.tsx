import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RoutineCard } from '../RoutineCard'

// ── Mocks ─────────────────────────────────────────────────────────────────────

let mockIsAuthenticated = false
const mockOpenAuthModal = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: mockIsAuthenticated }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

// ── Test data ──────────────────────────────────────────────────────────────────

const MOCK_TEMPLATE = {
  id: 'template-1',
  name: 'Evening Peace',
  isTemplate: true,
  steps: [{ id: 'step-1', type: 'scene' as const, contentId: 'rain', transitionGapMinutes: 0 }],
  sleepTimer: { durationMinutes: 45, fadeDurationMinutes: 15 },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('RoutineCard — Step 7 visual migration', () => {
  beforeEach(() => {
    mockIsAuthenticated = false
    vi.clearAllMocks()
  })

  it('Start CTA uses white-pill Pattern 2 chrome', () => {
    render(<RoutineCard routine={MOCK_TEMPLATE} onStart={vi.fn()} onClone={vi.fn()} />)
    const startBtn = screen.getByRole('button', { name: /Start/i })
    expect(startBtn.className).toContain('bg-white')
    expect(startBtn.className).toContain('rounded-full')
    expect(startBtn.className).toContain('min-h-[44px]')
    expect(startBtn.className).toContain('text-hero-bg')
  })

  it('Start CTA does NOT have bg-primary', () => {
    render(<RoutineCard routine={MOCK_TEMPLATE} onStart={vi.fn()} onClone={vi.fn()} />)
    const startBtn = screen.getByRole('button', { name: /Start/i })
    expect(startBtn.className).not.toContain('bg-primary')
  })

  it('Template badge has text-violet-300', () => {
    render(<RoutineCard routine={MOCK_TEMPLATE} onStart={vi.fn()} onClone={vi.fn()} />)
    const badge = screen.getByText('Template')
    expect(badge.className).toContain('text-violet-300')
  })

  it('Template badge preserves bg-primary/10 background', () => {
    render(<RoutineCard routine={MOCK_TEMPLATE} onStart={vi.fn()} onClone={vi.fn()} />)
    const badge = screen.getByText('Template')
    expect(badge.className).toContain('bg-primary/10')
  })

  it('Template badge does NOT have text-primary', () => {
    render(<RoutineCard routine={MOCK_TEMPLATE} onStart={vi.fn()} onClone={vi.fn()} />)
    const badge = screen.getByText('Template')
    // Ensure text-primary is not present (text-primary-lt substrings allowed for unrelated classes)
    const classes = badge.className.split(' ')
    expect(classes).not.toContain('text-primary')
  })

  it('kebab popover has border-white/[0.12]', async () => {
    const user = userEvent.setup()
    render(<RoutineCard routine={MOCK_TEMPLATE} onStart={vi.fn()} onClone={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /Routine options/i }))
    const menu = screen.getByRole('menu')
    expect(menu.className).toContain('border-white/[0.12]')
  })

  it('Start auth gate preserved when logged out', async () => {
    const user = userEvent.setup()
    render(<RoutineCard routine={MOCK_TEMPLATE} onStart={vi.fn()} onClone={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /Start/i }))
    expect(mockOpenAuthModal).toHaveBeenCalledWith('Sign in to use bedtime routines')
  })
})
