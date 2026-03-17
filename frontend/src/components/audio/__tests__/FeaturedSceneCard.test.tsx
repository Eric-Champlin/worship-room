import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { FeaturedSceneCard } from '../FeaturedSceneCard'
import type { ScenePreset } from '@/types/music'

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

const GARDEN_SCENE: ScenePreset = {
  id: 'garden-of-gethsemane',
  name: 'Garden of Gethsemane',
  description: 'Olive trees rustle in a warm evening breeze.',
  artworkFilename: 'garden-of-gethsemane.svg',
  sounds: [{ soundId: 'night-crickets', volume: 0.55 }],
  tags: { mood: ['contemplative'], activity: ['prayer'], intensity: 'very_calm', scriptureTheme: ['trust'] },
  animationCategory: 'pulse',
}

describe('FeaturedSceneCard', () => {
  it('renders scene name and description', () => {
    render(<FeaturedSceneCard scene={GARDEN_SCENE} isActive={false} onPlay={vi.fn()} />)

    expect(screen.getByText('Garden of Gethsemane')).toBeInTheDocument()
    expect(screen.getByText('Olive trees rustle in a warm evening breeze.')).toBeInTheDocument()
  })

  it('has correct aria-label', () => {
    render(<FeaturedSceneCard scene={GARDEN_SCENE} isActive={false} onPlay={vi.fn()} />)

    expect(
      screen.getByRole('button', {
        name: /Play Garden of Gethsemane — Olive trees rustle/,
      }),
    ).toBeInTheDocument()
  })

  it('calls onPlay when clicked', async () => {
    const user = userEvent.setup()
    const onPlay = vi.fn()
    render(<FeaturedSceneCard scene={GARDEN_SCENE} isActive={false} onPlay={onPlay} />)

    await user.click(screen.getByRole('button', { name: /Play Garden of Gethsemane/ }))
    expect(onPlay).toHaveBeenCalledWith(GARDEN_SCENE)
  })
})
