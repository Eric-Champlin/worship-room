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

describe('ScriptureSessionCard', () => {
  it('renders title, reference, duration, and Scripture badge', () => {
    render(<ScriptureSessionCard reading={MOCK_READING} onPlay={vi.fn()} />)

    expect(screen.getByText('The Lord is My Shepherd')).toBeInTheDocument()
    expect(screen.getByText('Psalm 23')).toBeInTheDocument()
    expect(screen.getByText('5 min')).toBeInTheDocument()
    expect(screen.getByText('Scripture')).toBeInTheDocument()
  })

  it('has correct aria-label with reference, title, duration, and voice', () => {
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

  it('shows voice gender indicator', () => {
    render(<ScriptureSessionCard reading={MOCK_READING} onPlay={vi.fn()} />)
    expect(screen.getByText('Male voice')).toBeInTheDocument()
  })

  it('renders heart icon with type "sleep_session"', () => {
    render(<ScriptureSessionCard reading={MOCK_READING} onPlay={vi.fn()} />)

    const heartButton = screen.getByRole('button', { name: /favorites/ })
    expect(heartButton).toBeInTheDocument()
  })

  it('Scripture badge uses the new violet treatment (WCAG AA)', () => {
    render(<ScriptureSessionCard reading={MOCK_READING} onPlay={vi.fn()} />)
    const badge = screen.getByText('Scripture').closest('span') as HTMLElement
    expect(badge.className).toContain('bg-violet-500/15')
    expect(badge.className).toContain('text-violet-300')
    expect(badge.className).not.toContain('bg-primary/10')
  })

  it('inline play button is inverted (white bg, purple icon) with subtle glow', () => {
    const { container } = render(
      <ScriptureSessionCard reading={MOCK_READING} onPlay={vi.fn()} />,
    )
    // The inline decorative play "button" is a span[aria-hidden=true] — not a real button
    const playIcon = container.querySelector('span[aria-hidden="true"]') as HTMLElement
    expect(playIcon).toBeTruthy()
    expect(playIcon.className).toContain('bg-white')
    expect(playIcon.className).toContain('text-primary')
    expect(playIcon.className).toContain(
      'shadow-[0_0_12px_rgba(255,255,255,0.12)]',
    )
    expect(playIcon.className).not.toContain('bg-primary text-white')
  })
})
