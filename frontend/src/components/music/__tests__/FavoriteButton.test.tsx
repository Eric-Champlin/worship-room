import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FavoriteButton } from '../FavoriteButton'

// ── Mocks ────────────────────────────────────────────────────────────

const mockOpenAuthModal = vi.fn()
const mockShowToast = vi.fn()
const mockToggleFavorite = vi.fn()
let mockIsAuthenticated = false
let mockIsFavorite = false

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: mockIsAuthenticated }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}))

vi.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({
    favorites: [],
    isFavorite: () => mockIsFavorite,
    toggleFavorite: mockToggleFavorite,
    isLoading: false,
  }),
}))

// ── Tests ────────────────────────────────────────────────────────────

describe('FavoriteButton', () => {
  const defaultProps = {
    type: 'scene' as const,
    targetId: 'morning-mist',
    targetName: 'Morning Mist',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAuthenticated = false
    mockIsFavorite = false
  })

  it('renders outlined heart when not favorited', () => {
    mockIsAuthenticated = true
    render(<FavoriteButton {...defaultProps} />)

    const button = screen.getByRole('button')
    const svg = button.querySelector('svg')
    expect(svg).toBeTruthy()
    // Not filled — fill attribute should be "none"
    expect(svg?.getAttribute('fill')).toBe('none')
  })

  it('renders filled heart when favorited', () => {
    mockIsAuthenticated = true
    mockIsFavorite = true
    render(<FavoriteButton {...defaultProps} />)

    const button = screen.getByRole('button')
    const svg = button.querySelector('svg')
    expect(svg?.getAttribute('fill')).toBe('currentColor')
  })

  it('shows aria-pressed="true" when favorited', () => {
    mockIsAuthenticated = true
    mockIsFavorite = true
    render(<FavoriteButton {...defaultProps} />)

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows aria-pressed="false" when not favorited', () => {
    mockIsAuthenticated = true
    render(<FavoriteButton {...defaultProps} />)

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('has correct aria-label with item name when not favorited', () => {
    mockIsAuthenticated = true
    render(<FavoriteButton {...defaultProps} />)

    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Add Morning Mist to favorites',
    )
  })

  it('has correct aria-label with item name when favorited', () => {
    mockIsAuthenticated = true
    mockIsFavorite = true
    render(<FavoriteButton {...defaultProps} />)

    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Remove Morning Mist from favorites',
    )
  })

  it('calls toggleFavorite on click (logged-in)', async () => {
    mockIsAuthenticated = true
    const user = userEvent.setup()

    render(<FavoriteButton {...defaultProps} />)
    await user.click(screen.getByRole('button'))

    expect(mockToggleFavorite).toHaveBeenCalledWith('scene', 'morning-mist')
  })

  it('opens auth modal on click (logged-out)', async () => {
    const user = userEvent.setup()

    render(<FavoriteButton {...defaultProps} />)
    await user.click(screen.getByRole('button'))

    expect(mockToggleFavorite).toHaveBeenCalledWith('scene', 'morning-mist')
  })

  it('renders sign-in aria-label when logged out', () => {
    render(<FavoriteButton {...defaultProps} />)

    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Sign in to add Morning Mist to favorites',
    )
  })

  it('click does not propagate to parent', async () => {
    mockIsAuthenticated = true
    const user = userEvent.setup()
    const parentClick = vi.fn()

    render(
      <div onClick={parentClick}>
        <FavoriteButton {...defaultProps} />
      </div>,
    )

    await user.click(screen.getByRole('button'))

    expect(parentClick).not.toHaveBeenCalled()
    expect(mockToggleFavorite).toHaveBeenCalled()
  })
})
