import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ScriptureSessionCard } from '../ScriptureSessionCard'
import type { ScriptureReading } from '@/types/music'

// ── Mocks for FavoriteButton dependencies ────────────────────────────
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false }),
}))
vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: vi.fn() }),
}))
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))
vi.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({
    favorites: [],
    isFavorite: () => false,
    toggleFavorite: vi.fn(),
    isLoading: false,
  }),
}))

const MOCK_READING: ScriptureReading = {
  id: 'psalm-23',
  title: 'The Lord is My Shepherd',
  scriptureReference: 'Psalm 23',
  collectionId: 'psalms-of-peace',
  webText: 'Yahweh is my shepherd.',
  audioFilename: 'scripture/psalm-23.mp3',
  durationSeconds: 300,
  voiceId: 'male',
  tags: ['peace'],
}

const MOCK_READING_FEMALE: ScriptureReading = {
  ...MOCK_READING,
  id: 'psalm-46',
  title: 'God is Our Refuge',
  scriptureReference: 'Psalm 46',
  voiceId: 'female',
}

describe('ScriptureSessionCard', () => {
  it('renders title, reference, duration, and Scripture badge', () => {
    render(<ScriptureSessionCard reading={MOCK_READING} onPlay={vi.fn()} />)

    expect(screen.getByText('The Lord is My Shepherd')).toBeInTheDocument()
    expect(screen.getByText('Psalm 23')).toBeInTheDocument()
    expect(screen.getByText('5 min')).toBeInTheDocument()
    expect(screen.getByText('Scripture')).toBeInTheDocument()
  })

  it('has aria-label preserving full voice semantics', () => {
    render(<ScriptureSessionCard reading={MOCK_READING} onPlay={vi.fn()} />)

    expect(
      screen.getByRole('button', {
        name: 'Play Psalm 23: The Lord is My Shepherd, 5 min, male voice',
      }),
    ).toBeInTheDocument()
  })

  it('calls onPlay when card is clicked', async () => {
    const onPlay = vi.fn()
    render(<ScriptureSessionCard reading={MOCK_READING} onPlay={onPlay} />)

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Play Psalm 23: The Lord is My Shepherd, 5 min, male voice',
      }),
    )
    expect(onPlay).toHaveBeenCalledWith(MOCK_READING)
  })

  it('voice pill visible text is shortened to "Male" (aria-label preserves "male voice")', () => {
    render(<ScriptureSessionCard reading={MOCK_READING} onPlay={vi.fn()} />)
    expect(screen.getByText('Male')).toBeInTheDocument()
    expect(screen.queryByText('Male voice')).toBeNull()
  })

  it('voice pill visible text is shortened to "Female" for female voiceId', () => {
    render(<ScriptureSessionCard reading={MOCK_READING_FEMALE} onPlay={vi.fn()} />)
    expect(screen.getByText('Female')).toBeInTheDocument()
    expect(screen.queryByText('Female voice')).toBeNull()
    // aria-label still contains "female voice"
    expect(
      screen.getByRole('button', {
        name: /female voice/,
      }),
    ).toBeInTheDocument()
  })

  it('renders heart icon with type "sleep_session"', () => {
    render(<ScriptureSessionCard reading={MOCK_READING} onPlay={vi.fn()} />)

    const heartButton = screen.getByRole('button', { name: /favorites/ })
    expect(heartButton).toBeInTheDocument()
  })

  it('Scripture badge uses the violet treatment with whitespace-nowrap', () => {
    render(<ScriptureSessionCard reading={MOCK_READING} onPlay={vi.fn()} />)
    const badge = screen.getByText('Scripture').closest('span') as HTMLElement
    expect(badge.className).toContain('bg-violet-500/15')
    expect(badge.className).toContain('text-violet-300')
    expect(badge.className).toContain('whitespace-nowrap')
    expect(badge.className).not.toContain('bg-primary/10')
  })

  it('inline play button is inverted (white bg, purple icon) with subtle glow', () => {
    const { container } = render(
      <ScriptureSessionCard reading={MOCK_READING} onPlay={vi.fn()} />,
    )
    const playIcon = container.querySelector('span[aria-hidden="true"]') as HTMLElement
    expect(playIcon).toBeTruthy()
    expect(playIcon.className).toContain('bg-white')
    expect(playIcon.className).toContain('text-primary')
    expect(playIcon.className).toContain(
      'shadow-[0_0_12px_rgba(255,255,255,0.12)]',
    )
    expect(playIcon.className).not.toContain('bg-primary text-white')
  })

  it('wrapper div has relative and h-full for equal-height grid behavior', () => {
    const { container } = render(
      <ScriptureSessionCard reading={MOCK_READING} onPlay={vi.fn()} />,
    )
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.className).toContain('relative')
    expect(wrapper.className).toContain('h-full')
  })

  it('button uses flex h-full flex-col and drops horizontal-scroll artifact classes', () => {
    render(<ScriptureSessionCard reading={MOCK_READING} onPlay={vi.fn()} />)
    const button = screen.getByRole('button', {
      name: /Play Psalm 23/,
    })
    expect(button.className).toContain('flex')
    expect(button.className).toContain('h-full')
    expect(button.className).toContain('flex-col')
    expect(button.className).not.toContain('min-w-[220px]')
    expect(button.className).not.toContain('shrink-0')
    expect(button.className).not.toContain('snap-start')
  })

  it('action row uses mt-auto pt-3 gap-1.5 (not mt-3 or gap-2)', () => {
    render(<ScriptureSessionCard reading={MOCK_READING} onPlay={vi.fn()} />)
    const durationPill = screen.getByText('5 min').closest('span') as HTMLElement
    const actionRow = durationPill.parentElement as HTMLElement
    expect(actionRow.className).toContain('mt-auto')
    expect(actionRow.className).toContain('pt-3')
    expect(actionRow.className).toContain('gap-1.5')
    expect(actionRow.className).not.toContain('mt-3')
    expect(actionRow.className).not.toContain('gap-2')
  })

  it('duration pill uses unified pill treatment (bg-white/10, text-white/70)', () => {
    render(<ScriptureSessionCard reading={MOCK_READING} onPlay={vi.fn()} />)
    const pill = screen.getByText('5 min').closest('span') as HTMLElement
    expect(pill.className).toContain('bg-white/10')
    expect(pill.className).toContain('text-white/70')
    expect(pill.className).toContain('font-medium')
    expect(pill.className).toContain('rounded-full')
    expect(pill.className).toContain('whitespace-nowrap')
    expect(pill.className).not.toContain('text-white/50')
  })

  it('voice pill uses the same unified pill treatment as the duration pill', () => {
    render(<ScriptureSessionCard reading={MOCK_READING} onPlay={vi.fn()} />)
    const pill = screen.getByText('Male').closest('span') as HTMLElement
    expect(pill.className).toContain('bg-white/10')
    expect(pill.className).toContain('text-white/70')
    expect(pill.className).toContain('font-medium')
    expect(pill.className).toContain('rounded-full')
    expect(pill.className).toContain('whitespace-nowrap')
  })
})
