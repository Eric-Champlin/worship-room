import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SharedMixHero } from '../SharedMixHero'
import type { SharedMixData } from '@/types/storage'

// ── Mocks ────────────────────────────────────────────────────────────

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

vi.mock('@/data/sound-catalog', () => ({
  SOUND_BY_ID: new Map([
    ['gentle-rain', { id: 'gentle-rain', name: 'Gentle Rain', lucideIcon: 'CloudRain' }],
    ['fireplace', { id: 'fireplace', name: 'Fireplace', lucideIcon: 'Flame' }],
  ]),
}))

vi.mock('@/components/audio/sound-icon-map', () => ({
  getSoundIcon: () => () => null,
}))

// ── Tests ────────────────────────────────────────────────────────────

describe('SharedMixHero', () => {
  const mixData: SharedMixData = {
    sounds: [
      { id: 'gentle-rain', v: 0.7 },
      { id: 'fireplace', v: 0.5 },
    ],
  }

  const defaultProps = {
    mixData,
    onPlay: vi.fn(),
    onDismiss: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders mix name from sound names', () => {
    render(<SharedMixHero {...defaultProps} />)
    expect(screen.getByText('Gentle Rain + Fireplace')).toBeInTheDocument()
  })

  it('renders sound list with names', () => {
    render(<SharedMixHero {...defaultProps} />)
    expect(screen.getByText('Gentle Rain')).toBeInTheDocument()
    expect(screen.getByText('Fireplace')).toBeInTheDocument()
  })

  it('has correct aria-labelledby referencing the title', () => {
    render(<SharedMixHero {...defaultProps} />)
    const section = document.querySelector('section[aria-labelledby="shared-mix-title"]')
    expect(section).toBeInTheDocument()
    const title = document.getElementById('shared-mix-title')
    expect(title).toBeInTheDocument()
  })

  it('"Play This Mix" button calls onPlay', async () => {
    const user = userEvent.setup()
    render(<SharedMixHero {...defaultProps} />)

    await user.click(screen.getByText('Play This Mix'))
    expect(defaultProps.onPlay).toHaveBeenCalled()
  })

  it('X button calls onDismiss', async () => {
    const user = userEvent.setup()
    render(<SharedMixHero {...defaultProps} />)

    await user.click(screen.getByLabelText('Dismiss shared mix'))
    expect(defaultProps.onDismiss).toHaveBeenCalled()
  })

  it('FavoriteButton shows sign-in label for logged-out', () => {
    render(<SharedMixHero {...defaultProps} />)
    // FavoriteButton should be present with sign-in aria-label for logged-out
    const heartButton = screen.getByRole('button', { name: /Sign in to add .+ to favorites/ })
    expect(heartButton).toBeInTheDocument()
  })
})
