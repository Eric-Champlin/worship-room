import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CelebrateReaction } from '../CelebrateReaction'

// Mock auth hook + auth modal context + sound effects so we can verify the
// auth-gating behavior without spinning up the full provider tree.
const mockOpenAuthModal = vi.fn()
const mockPlaySoundEffect = vi.fn()
let mockIsAuthenticated = false

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated, user: null }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

vi.mock('@/hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({ playSoundEffect: mockPlaySoundEffect }),
}))

describe('CelebrateReaction', () => {
  beforeEach(() => {
    mockOpenAuthModal.mockClear()
    mockPlaySoundEffect.mockClear()
    mockIsAuthenticated = false
  })

  it('renders inactive state by default with the count', () => {
    render(<CelebrateReaction isActive={false} count={3} onToggle={vi.fn()} />)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button).toHaveAttribute('aria-label', 'Celebrate this answered prayer')
    expect(button.textContent).toContain('Celebrate (3)')
  })

  it('renders active state with aria-pressed=true and active aria-label', () => {
    render(<CelebrateReaction isActive count={5} onToggle={vi.fn()} />)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button.getAttribute('aria-label')).toMatch(/You're celebrating/)
  })

  it('opens auth modal when logged-out and skips onToggle', async () => {
    mockIsAuthenticated = false
    const onToggle = vi.fn()
    const user = userEvent.setup()
    render(<CelebrateReaction isActive={false} count={0} onToggle={onToggle} />)
    await user.click(screen.getByRole('button'))
    expect(mockOpenAuthModal).toHaveBeenCalledTimes(1)
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('fires onToggle + sparkle sound when logged-in', async () => {
    mockIsAuthenticated = true
    const onToggle = vi.fn()
    const user = userEvent.setup()
    render(<CelebrateReaction isActive={false} count={0} onToggle={onToggle} />)
    await user.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(mockPlaySoundEffect).toHaveBeenCalledWith('sparkle')
    expect(mockOpenAuthModal).not.toHaveBeenCalled()
  })

  it('updates count text when count prop changes', () => {
    const { rerender } = render(
      <CelebrateReaction isActive={false} count={0} onToggle={vi.fn()} />,
    )
    expect(screen.getByRole('button').textContent).toContain('Celebrate (0)')
    rerender(<CelebrateReaction isActive count={1} onToggle={vi.fn()} />)
    expect(screen.getByRole('button').textContent).toContain('Celebrate (1)')
  })
})
