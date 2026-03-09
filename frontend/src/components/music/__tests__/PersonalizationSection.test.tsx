import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PersonalizationSection } from '../PersonalizationSection'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, isLoggedIn: false })),
}))

import { useAuth } from '@/hooks/useAuth'
const mockUseAuth = vi.mocked(useAuth)

describe('PersonalizationSection', () => {
  it('returns null when logged out', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoggedIn: false })
    const { container } = render(<PersonalizationSection />)
    expect(container.innerHTML).toBe('')
  })

  it('returns null when logged in but no data', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', firstName: 'Test', lastName: 'User', email: 'a@b.com' },
      isLoggedIn: true,
    })
    const { container } = render(<PersonalizationSection />)
    expect(container.innerHTML).toBe('')
  })

  it('renders continue listening when data exists', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', firstName: 'Test', lastName: 'User', email: 'a@b.com' },
      isLoggedIn: true,
    })
    render(
      <PersonalizationSection
        continueListening={{
          title: 'Rainy Evening',
          type: 'Ambient Scene',
          onPlay: vi.fn(),
        }}
      />,
    )
    expect(screen.getByText('Rainy Evening')).toBeInTheDocument()
    expect(screen.getByText('Continue Listening')).toBeInTheDocument()
  })

  it('has correct aria-label', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', firstName: 'Test', lastName: 'User', email: 'a@b.com' },
      isLoggedIn: true,
    })
    render(
      <PersonalizationSection
        continueListening={{
          title: 'Test',
          type: 'Scene',
          onPlay: vi.fn(),
        }}
      />,
    )
    expect(
      screen.getByLabelText('Personalized recommendations'),
    ).toBeInTheDocument()
  })
})
