import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { BedtimeStoryCard } from '../BedtimeStoryCard'
import type { BedtimeStory } from '@/types/music'

// ── Mocks for FavoriteButton dependencies ────────────────────────────
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isLoggedIn: false }),
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

  it('has role="button" and descriptive aria-label', () => {
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
})
