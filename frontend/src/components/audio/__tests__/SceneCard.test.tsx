import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SceneCard } from '../SceneCard'
import type { ScenePreset } from '@/types/music'

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

const GARDEN_SCENE: ScenePreset = {
  id: 'garden-of-gethsemane',
  name: 'Garden of Gethsemane',
  description: 'Olive trees rustle in a warm evening breeze.',
  artworkFilename: 'garden-of-gethsemane.svg',
  sounds: [{ soundId: 'night-crickets', volume: 0.55 }],
  tags: { mood: ['contemplative'], activity: ['prayer'], intensity: 'very_calm', scriptureTheme: ['trust'] },
  animationCategory: 'pulse',
}

describe('SceneCard', () => {
  it('renders name and tag chips', () => {
    render(<SceneCard scene={GARDEN_SCENE} isActive={false} onPlay={vi.fn()} />)

    expect(screen.getByText('Garden of Gethsemane')).toBeInTheDocument()
    // Tag chips: first mood + first activity
    expect(screen.getByText('Contemplative')).toBeInTheDocument()
    expect(screen.getByText('Prayer')).toBeInTheDocument()
  })

  it('has role="button" and aria-label', () => {
    render(<SceneCard scene={GARDEN_SCENE} isActive={false} onPlay={vi.fn()} />)

    const button = screen.getByRole('button', { name: /Play Garden of Gethsemane/ })
    expect(button).toBeInTheDocument()
  })

  it('calls onPlay when clicked', async () => {
    const user = userEvent.setup()
    const onPlay = vi.fn()
    render(<SceneCard scene={GARDEN_SCENE} isActive={false} onPlay={onPlay} />)

    await user.click(screen.getByRole('button', { name: /Play Garden of Gethsemane/ }))
    expect(onPlay).toHaveBeenCalledWith(GARDEN_SCENE)
  })

  it('shows active indicator when active', () => {
    render(<SceneCard scene={GARDEN_SCENE} isActive={true} onPlay={vi.fn()} />)

    const button = screen.getByRole('button', { name: /Play Garden of Gethsemane/ })
    expect(button.className).toContain('ring-2')
    expect(button.className).toContain('ring-primary/60')
  })

  it('renders heart icon for favorites', () => {
    render(<SceneCard scene={GARDEN_SCENE} isActive={false} onPlay={vi.fn()} />)

    const heartButton = screen.getByRole('button', { name: /favorites/ })
    expect(heartButton).toBeInTheDocument()
  })

  it('heart click does not trigger onPlay', async () => {
    const user = userEvent.setup()
    const onPlay = vi.fn()
    render(<SceneCard scene={GARDEN_SCENE} isActive={false} onPlay={onPlay} />)

    await user.click(screen.getByRole('button', { name: /favorites/ }))
    expect(onPlay).not.toHaveBeenCalled()
  })
})
