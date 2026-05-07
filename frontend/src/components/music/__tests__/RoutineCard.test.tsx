import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RoutineCard } from '../RoutineCard'

// ── Mocks ─────────────────────────────────────────────────────────────────────

let mockIsAuthenticated = false
const mockOpenAuthModal = vi.fn()
const mockToggleRoutineFavorite = vi.fn()
let mockIsRoutineFavorited = false

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: mockIsAuthenticated }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

vi.mock('@/services/storage-service', () => ({
  storageService: {
    isRoutineFavorited: vi.fn(() => mockIsRoutineFavorited),
    toggleRoutineFavorite: vi.fn((...args) => mockToggleRoutineFavorite(...args)),
    getRoutines: vi.fn().mockReturnValue([]),
    saveRoutine: vi.fn(),
    updateRoutine: vi.fn(),
    deleteRoutine: vi.fn(),
    duplicateRoutine: vi.fn(),
    logListeningSession: vi.fn(),
    getRoutineFavorites: vi.fn().mockReturnValue([]),
  },
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

const MOCK_SCENE_STEP_ROUTINE = {
  id: 'scene-routine-1',
  name: 'Still Waters Rest',
  isTemplate: false,
  steps: [{ id: 's1', type: 'scene' as const, contentId: 'still-waters', transitionGapMinutes: 0 }],
  sleepTimer: { durationMinutes: 0, fadeDurationMinutes: 0 },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const MOCK_SCRIPTURE_STEP_ROUTINE = {
  id: 'scripture-routine-1',
  name: 'Scripture Night',
  isTemplate: false,
  steps: [{ id: 's2', type: 'scripture' as const, contentId: 'ps23', transitionGapMinutes: 0 }],
  sleepTimer: { durationMinutes: 0, fadeDurationMinutes: 0 },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const MOCK_STORY_STEP_ROUTINE = {
  id: 'story-routine-1',
  name: 'Bedtime Story',
  isTemplate: false,
  steps: [{ id: 's3', type: 'story' as const, contentId: 'story-1', transitionGapMinutes: 0 }],
  sleepTimer: { durationMinutes: 0, fadeDurationMinutes: 0 },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const MOCK_BIBLE_NAV_STEP_ROUTINE = {
  id: 'biblenav-routine-1',
  name: 'Bible Navigate Night',
  isTemplate: false,
  steps: [{ id: 's4', type: 'bible-navigate' as const, contentId: 'john-3', transitionGapMinutes: 0 }],
  sleepTimer: { durationMinutes: 0, fadeDurationMinutes: 0 },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const MOCK_NO_SCENE_ROUTINE = {
  id: 'no-scene-1',
  name: 'No Scene Routine',
  isTemplate: false,
  steps: [{ id: 's5', type: 'scripture' as const, contentId: 'ps23', transitionGapMinutes: 0 }],
  sleepTimer: { durationMinutes: 0, fadeDurationMinutes: 0 },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const MOCK_USER_ROUTINE = {
  id: 'user-routine-1',
  name: 'My Custom Routine',
  isTemplate: false,
  steps: [{ id: 's6', type: 'scene' as const, contentId: 'rain', transitionGapMinutes: 0 }],
  sleepTimer: { durationMinutes: 0, fadeDurationMinutes: 0 },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const MOCK_SLEEP_TIMER_ROUTINE = {
  id: 'sleep-timer-1',
  name: 'Sleep Timer Routine',
  isTemplate: false,
  steps: [{ id: 's7', type: 'scene' as const, contentId: 'rain', transitionGapMinutes: 0 }],
  sleepTimer: { durationMinutes: 30, fadeDurationMinutes: 10 },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('RoutineCard — Step 7 visual migration', () => {
  beforeEach(() => {
    mockIsAuthenticated = false
    mockIsRoutineFavorited = false
    vi.clearAllMocks()
  })

  it('Start CTA uses white-pill peer-tier (quieted) chrome', () => {
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

describe('RoutineCard — Step 6 — Step icon tints', () => {
  beforeEach(() => {
    mockIsAuthenticated = false
    mockIsRoutineFavorited = false
    vi.clearAllMocks()
  })

  it('scene step icon has bg-glow-cyan/15 container', () => {
    render(<RoutineCard routine={MOCK_SCENE_STEP_ROUTINE} onStart={vi.fn()} />)
    const icon = screen.getByRole('img', { name: 'scene' })
    expect(icon.className).toContain('bg-glow-cyan/15')
  })

  it('scene step icon has text-glow-cyan', () => {
    render(<RoutineCard routine={MOCK_SCENE_STEP_ROUTINE} onStart={vi.fn()} />)
    const icon = screen.getByRole('img', { name: 'scene' })
    // The SVG inside the span carries the icon color class
    const svg = icon.querySelector('svg')
    expect(svg?.getAttribute('class')).toContain('text-glow-cyan')
  })

  it('scripture step icon has bg-amber-400/15 container', () => {
    render(<RoutineCard routine={MOCK_SCRIPTURE_STEP_ROUTINE} onStart={vi.fn()} />)
    const icon = screen.getByRole('img', { name: 'scripture' })
    expect(icon.className).toContain('bg-amber-400/15')
  })

  it('story step icon has bg-primary-lt/15 container and text-primary-lt icon', () => {
    render(<RoutineCard routine={MOCK_STORY_STEP_ROUTINE} onStart={vi.fn()} />)
    const icon = screen.getByRole('img', { name: 'story' })
    expect(icon.className).toContain('bg-primary-lt/15')
    const svg = icon.querySelector('svg')
    expect(svg?.getAttribute('class')).toContain('text-primary-lt')
  })

  it('bible-navigate step gets amber tint (same as scripture)', () => {
    render(<RoutineCard routine={MOCK_BIBLE_NAV_STEP_ROUTINE} onStart={vi.fn()} />)
    const icon = screen.getByRole('img', { name: 'bible-navigate' })
    expect(icon.className).toContain('bg-amber-400/15')
  })
})

describe('RoutineCard — Step 7 — Scene-color top strip', () => {
  beforeEach(() => {
    mockIsAuthenticated = false
    mockIsRoutineFavorited = false
    vi.clearAllMocks()
  })

  it('renders a top strip when first step is a scene with themeColor', () => {
    render(<RoutineCard routine={MOCK_SCENE_STEP_ROUTINE} onStart={vi.fn()} />)
    // The strip is aria-hidden, so query by attribute
    const strip = document.querySelector('[aria-hidden="true"].absolute.top-0')
    expect(strip).toBeTruthy()
  })

  it('top strip style includes still-waters themeColor #356060', () => {
    render(<RoutineCard routine={MOCK_SCENE_STEP_ROUTINE} onStart={vi.fn()} />)
    const strip = document.querySelector('[aria-hidden="true"].absolute.top-0') as HTMLElement
    expect(strip?.style.backgroundImage).toContain('#356060')
  })

  it('top strip uses linear-gradient to right', () => {
    render(<RoutineCard routine={MOCK_SCENE_STEP_ROUTINE} onStart={vi.fn()} />)
    const strip = document.querySelector('[aria-hidden="true"].absolute.top-0') as HTMLElement
    expect(strip?.style.backgroundImage).toContain('linear-gradient')
  })

  it('does NOT render a top strip when routine has no scene step', () => {
    render(<RoutineCard routine={MOCK_NO_SCENE_ROUTINE} onStart={vi.fn()} />)
    const strip = document.querySelector('[aria-hidden="true"].absolute.top-0')
    expect(strip).toBeFalsy()
  })

  it('top strip has h-1 class (1px tall)', () => {
    render(<RoutineCard routine={MOCK_SCENE_STEP_ROUTINE} onStart={vi.fn()} />)
    const strip = document.querySelector('[aria-hidden="true"].absolute.top-0')
    expect(strip?.className).toContain('h-1')
  })
})

describe('RoutineCard — Step 8 — Active-routine treatment', () => {
  beforeEach(() => {
    mockIsAuthenticated = false
    mockIsRoutineFavorited = false
    vi.clearAllMocks()
  })

  it('shows "Now playing" chip when isActive=true', () => {
    render(<RoutineCard routine={MOCK_USER_ROUTINE} onStart={vi.fn()} isActive />)
    expect(screen.getByText(/Now playing/i)).toBeInTheDocument()
  })

  it('"Now playing" chip has text-violet-300', () => {
    render(<RoutineCard routine={MOCK_USER_ROUTINE} onStart={vi.fn()} isActive />)
    const chip = screen.getByText(/Now playing/i)
    expect(chip.className).toContain('text-violet-300')
  })

  it('"Now playing" chip has a static inline dot (not animated)', () => {
    render(<RoutineCard routine={MOCK_USER_ROUTINE} onStart={vi.fn()} isActive />)
    const chip = screen.getByText(/Now playing/i)
    const dot = chip.querySelector('[aria-hidden="true"]')
    // dot should NOT have animate-ping or animate-pulse class
    expect(dot?.className).not.toContain('animate-ping')
    expect(dot?.className).not.toContain('animate-pulse')
    expect(dot?.className).toContain('rounded-full')
  })

  it('isActive=true overrides border to border-primary/40', () => {
    render(<RoutineCard routine={MOCK_USER_ROUTINE} onStart={vi.fn()} isActive />)
    // The card outer div should have border-primary/40
    const article = screen.getByRole('article')
    expect(article.className).toContain('border-primary/40')
  })

  it('isActive=false shows default border-white/[0.12]', () => {
    render(<RoutineCard routine={MOCK_USER_ROUTINE} onStart={vi.fn()} isActive={false} />)
    const article = screen.getByRole('article')
    expect(article.className).toContain('border-white/[0.12]')
  })

  it('isActive=true does NOT render template badge', () => {
    const activeTemplate = { ...MOCK_TEMPLATE, isTemplate: true }
    render(<RoutineCard routine={activeTemplate} onStart={vi.fn()} isActive />)
    expect(screen.queryByText('Template')).not.toBeInTheDocument()
    expect(screen.getByText(/Now playing/i)).toBeInTheDocument()
  })

  it('isActive=false, isTemplate=false renders no badge', () => {
    render(<RoutineCard routine={MOCK_USER_ROUTINE} onStart={vi.fn()} isActive={false} />)
    expect(screen.queryByText('Template')).not.toBeInTheDocument()
    expect(screen.queryByText(/Now playing/i)).not.toBeInTheDocument()
  })
})

describe('RoutineCard — Step 9 — Start CTA quieting', () => {
  beforeEach(() => {
    mockIsAuthenticated = false
    mockIsRoutineFavorited = false
    vi.clearAllMocks()
  })

  it('Start CTA uses peer-tier sizing px-6 py-2.5 text-sm (not showstopper px-8 py-3.5 text-base)', () => {
    render(<RoutineCard routine={MOCK_TEMPLATE} onStart={vi.fn()} onClone={vi.fn()} />)
    const startBtn = screen.getByRole('button', { name: /Start/i })
    expect(startBtn.className).toContain('px-6')
    expect(startBtn.className).toContain('py-2.5')
    expect(startBtn.className).toContain('text-sm')
    expect(startBtn.className).not.toContain('px-8')
    expect(startBtn.className).not.toContain('py-3.5')
    expect(startBtn.className).not.toContain('text-base')
  })

  it('Start CTA retains white pill chrome: bg-white rounded-full text-hero-bg', () => {
    render(<RoutineCard routine={MOCK_TEMPLATE} onStart={vi.fn()} onClone={vi.fn()} />)
    const startBtn = screen.getByRole('button', { name: /Start/i })
    expect(startBtn.className).toContain('bg-white')
    expect(startBtn.className).toContain('rounded-full')
    expect(startBtn.className).toContain('text-hero-bg')
  })

  it('Start CTA has min-h-[44px] for accessibility', () => {
    render(<RoutineCard routine={MOCK_TEMPLATE} onStart={vi.fn()} onClone={vi.fn()} />)
    const startBtn = screen.getByRole('button', { name: /Start/i })
    expect(startBtn.className).toContain('min-h-[44px]')
  })

  it('Start CTA calls onStart when authenticated', async () => {
    mockIsAuthenticated = true
    const onStart = vi.fn()
    const user = userEvent.setup()
    render(<RoutineCard routine={MOCK_TEMPLATE} onStart={onStart} onClone={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /Start/i }))
    expect(onStart).toHaveBeenCalledOnce()
    expect(mockOpenAuthModal).not.toHaveBeenCalled()
  })
})

describe('RoutineCard — Step 10 — Favorite button', () => {
  beforeEach(() => {
    mockIsAuthenticated = false
    mockIsRoutineFavorited = false
    vi.clearAllMocks()
  })

  it('renders a Favorite button', () => {
    render(<RoutineCard routine={MOCK_USER_ROUTINE} onStart={vi.fn()} />)
    const favBtn = screen.getByRole('button', { name: /Favorite/i })
    expect(favBtn).toBeInTheDocument()
  })

  it('Favorite button has aria-pressed=false when not favorited', () => {
    mockIsRoutineFavorited = false
    render(<RoutineCard routine={MOCK_USER_ROUTINE} onStart={vi.fn()} />)
    const favBtn = screen.getByRole('button', { name: /Favorite/i })
    expect(favBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('Favorite button has aria-pressed=true when favorited', () => {
    mockIsRoutineFavorited = true
    render(<RoutineCard routine={MOCK_USER_ROUTINE} onStart={vi.fn()} />)
    const favBtn = screen.getByRole('button', { name: /Favorite/i })
    expect(favBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('opens auth modal when logged out user clicks Favorite', async () => {
    const user = userEvent.setup()
    render(<RoutineCard routine={MOCK_USER_ROUTINE} onStart={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /Favorite/i }))
    expect(mockOpenAuthModal).toHaveBeenCalledWith('Sign in to favorite routines')
  })

  it('toggles favorite state and calls service when authenticated', async () => {
    mockIsAuthenticated = true
    const { storageService } = await import('@/services/storage-service')
    const user = userEvent.setup()
    render(<RoutineCard routine={MOCK_USER_ROUTINE} onStart={vi.fn()} />)
    const favBtn = screen.getByRole('button', { name: /Favorite/i })
    expect(favBtn).toHaveAttribute('aria-pressed', 'false')
    await user.click(favBtn)
    expect(storageService.toggleRoutineFavorite).toHaveBeenCalledWith(MOCK_USER_ROUTINE.id)
  })
})

describe('RoutineCard — Step 11 — Sleep-timer Moon glyph', () => {
  beforeEach(() => {
    mockIsAuthenticated = false
    mockIsRoutineFavorited = false
    vi.clearAllMocks()
  })

  it('renders Moon icon when sleepTimer.durationMinutes > 0', () => {
    render(<RoutineCard routine={MOCK_SLEEP_TIMER_ROUTINE} onStart={vi.fn()} />)
    // Moon icon is aria-hidden; look for its container in the meta row
    const metaRow = screen.getByText(/steps/i).closest('p')
    const svg = metaRow?.querySelector('svg[aria-hidden="true"]')
    expect(svg).toBeTruthy()
  })

  it('does NOT render Moon icon when sleepTimer.durationMinutes is 0', () => {
    render(<RoutineCard routine={MOCK_USER_ROUTINE} onStart={vi.fn()} />)
    const metaRow = screen.getByText(/steps/i).closest('p')
    const svg = metaRow?.querySelector('svg[aria-hidden="true"]')
    expect(svg).toBeFalsy()
  })

  it('meta row shows step count and duration estimate', () => {
    render(<RoutineCard routine={MOCK_SLEEP_TIMER_ROUTINE} onStart={vi.fn()} />)
    expect(screen.getByText(/1 steps/i)).toBeInTheDocument()
  })

  it('Moon icon has text-violet-300 class', () => {
    render(<RoutineCard routine={MOCK_SLEEP_TIMER_ROUTINE} onStart={vi.fn()} />)
    const metaRow = screen.getByText(/steps/i).closest('p')
    const svg = metaRow?.querySelector('svg[aria-hidden="true"]') as SVGElement
    expect(svg?.getAttribute('class')).toContain('text-violet-300')
  })
})
