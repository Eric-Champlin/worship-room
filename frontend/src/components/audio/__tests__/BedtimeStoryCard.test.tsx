import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { BedtimeStoryCard } from '../BedtimeStoryCard'
import type { BedtimeStory } from '@/types/music'

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

const MOCK_STORY: BedtimeStory = {
  id: 'noah-and-the-great-flood',
  title: 'Noah and the Great Flood',
  description:
    'The world grows dark with wickedness, but one faithful man hears God\u2019s voice. As rain begins to fall, Noah\u2019s trust is rewarded with a promise written in the sky.',
  audioFilename: 'stories/noah-and-the-great-flood.mp3',
  durationSeconds: 1080,
  voiceId: 'male',
  lengthCategory: 'medium',
  tags: ['faith'],
}

const MOCK_STORY_FEMALE: BedtimeStory = {
  ...MOCK_STORY,
  id: 'esther-story',
  title: 'Esther',
  voiceId: 'female',
}

describe('BedtimeStoryCard', () => {
  it('renders title, description, duration, and length category', () => {
    render(<BedtimeStoryCard story={MOCK_STORY} onPlay={vi.fn()} />)

    expect(screen.getByText('Noah and the Great Flood')).toBeInTheDocument()
    expect(screen.getByText(/The world grows dark/)).toBeInTheDocument()
    expect(screen.getByText('18 min')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
  })

  it('shows "Story" badge', () => {
    render(<BedtimeStoryCard story={MOCK_STORY} onPlay={vi.fn()} />)

    expect(screen.getByText('Story')).toBeInTheDocument()
  })

  it('has role="button" and descriptive aria-label preserving full voice semantics', () => {
    render(<BedtimeStoryCard story={MOCK_STORY} onPlay={vi.fn()} />)

    expect(
      screen.getByRole('button', {
        name: 'Play Noah and the Great Flood, Medium, 18 min, male voice',
      }),
    ).toBeInTheDocument()
  })

  it('calls onPlay when clicked', async () => {
    const onPlay = vi.fn()
    render(<BedtimeStoryCard story={MOCK_STORY} onPlay={onPlay} />)

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Play Noah and the Great Flood, Medium, 18 min, male voice',
      }),
    )
    expect(onPlay).toHaveBeenCalledWith(MOCK_STORY)
  })

  it('description has line-clamp-2 class for truncation', () => {
    const { container } = render(
      <BedtimeStoryCard story={MOCK_STORY} onPlay={vi.fn()} />,
    )

    const desc = container.querySelector('.line-clamp-2')
    expect(desc).toBeInTheDocument()
  })

  it('Story badge uses the violet treatment with whitespace-nowrap', () => {
    render(<BedtimeStoryCard story={MOCK_STORY} onPlay={vi.fn()} />)
    const badge = screen.getByText('Story').closest('span') as HTMLElement
    expect(badge.className).toContain('bg-violet-500/15')
    expect(badge.className).toContain('text-violet-300')
    expect(badge.className).toContain('whitespace-nowrap')
    expect(badge.className).not.toContain('bg-primary/10')
  })

  it('Story badge has Moon icon', () => {
    render(<BedtimeStoryCard story={MOCK_STORY} onPlay={vi.fn()} />)
    const badge = screen.getByText('Story').closest('span') as HTMLElement
    expect(badge.querySelector('svg')).toBeInTheDocument()
  })

  it('wrapper div has relative and h-full for equal-height grid behavior', () => {
    const { container } = render(
      <BedtimeStoryCard story={MOCK_STORY} onPlay={vi.fn()} />,
    )
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.className).toContain('relative')
    expect(wrapper.className).toContain('h-full')
  })

  it('button uses flex h-full flex-col for equal-height cards', () => {
    render(<BedtimeStoryCard story={MOCK_STORY} onPlay={vi.fn()} />)
    const button = screen.getByRole('button', {
      name: /Play Noah and the Great Flood/,
    })
    expect(button.className).toContain('flex')
    expect(button.className).toContain('h-full')
    expect(button.className).toContain('flex-col')
  })

  it('action row uses mt-auto pt-3 flex-wrap gap-1 (tighter than ScriptureCard to fit 4 pills + play)', () => {
    render(<BedtimeStoryCard story={MOCK_STORY} onPlay={vi.fn()} />)
    const durationPill = screen.getByText('18 min').closest('span') as HTMLElement
    const actionRow = durationPill.parentElement as HTMLElement
    expect(actionRow.className).toContain('mt-auto')
    expect(actionRow.className).toContain('pt-3')
    expect(actionRow.className).toContain('flex-wrap')
    expect(actionRow.className).toContain('gap-1')
    expect(actionRow.className).not.toContain('mt-3')
    expect(actionRow.className).not.toContain('gap-2')
    expect(actionRow.className).not.toContain('gap-1.5')
  })

  it('duration pill uses unified treatment (bg-white/10, text-white/70)', () => {
    render(<BedtimeStoryCard story={MOCK_STORY} onPlay={vi.fn()} />)
    const pill = screen.getByText('18 min').closest('span') as HTMLElement
    expect(pill.className).toContain('bg-white/10')
    expect(pill.className).toContain('text-white/70')
    expect(pill.className).toContain('font-medium')
    expect(pill.className).toContain('rounded-full')
    expect(pill.className).toContain('whitespace-nowrap')
    expect(pill.className).not.toContain('text-white/50')
  })

  it('length pill uses unified treatment', () => {
    render(<BedtimeStoryCard story={MOCK_STORY} onPlay={vi.fn()} />)
    const pill = screen.getByText('Medium').closest('span') as HTMLElement
    expect(pill.className).toContain('bg-white/10')
    expect(pill.className).toContain('text-white/70')
    expect(pill.className).toContain('font-medium')
    expect(pill.className).toContain('rounded-full')
    expect(pill.className).toContain('whitespace-nowrap')
  })

  it('voice pill renders shortened "Male" text (not "Male voice") with unified treatment', () => {
    render(<BedtimeStoryCard story={MOCK_STORY} onPlay={vi.fn()} />)
    // Visible pill text is just "Male"
    const pill = screen.getByText('Male').closest('span') as HTMLElement
    expect(pill).toBeTruthy()
    expect(pill.className).toContain('bg-white/10')
    expect(pill.className).toContain('text-white/70')
    expect(pill.className).toContain('font-medium')
    expect(pill.className).toContain('rounded-full')
    expect(pill.className).toContain('whitespace-nowrap')
    // Full "Male voice" / "Female voice" must NOT appear as visible text
    expect(screen.queryByText('Male voice')).toBeNull()
    expect(screen.queryByText('Female voice')).toBeNull()
  })

  it('voice pill renders "Female" for female voiceId', () => {
    render(<BedtimeStoryCard story={MOCK_STORY_FEMALE} onPlay={vi.fn()} />)
    expect(screen.getByText('Female')).toBeInTheDocument()
    expect(screen.queryByText('Female voice')).toBeNull()
  })

  it('play button is inverted: white bg, primary icon, white glow', () => {
    const { container } = render(
      <BedtimeStoryCard story={MOCK_STORY} onPlay={vi.fn()} />,
    )
    // Find the play span — it has aria-hidden and ml-auto
    const playSpan = container.querySelector('span.ml-auto[aria-hidden="true"]') as HTMLElement
    expect(playSpan).toBeTruthy()
    expect(playSpan.className).toContain('bg-white')
    expect(playSpan.className).toContain('text-primary')
    expect(playSpan.className).toContain('shadow-[0_0_12px_rgba(255,255,255,0.12)]')
    // Old Round-1 treatment classes must NOT be present on the play span
    expect(playSpan.className).not.toContain('bg-primary')
  })
})
