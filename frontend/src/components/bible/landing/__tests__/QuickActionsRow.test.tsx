import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { QuickActionsRow } from '../QuickActionsRow'
import { BibleDrawerProvider } from '@/components/bible/BibleDrawerProvider'

const mockUseAuth = vi.fn(() => ({
  isAuthenticated: false,
  user: null,
  login: vi.fn(),
  logout: vi.fn(),
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockOpenAuthModal = vi.fn()
vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

function renderWithProviders() {
  return render(
    <MemoryRouter>
      <BibleDrawerProvider>
        <QuickActionsRow />
      </BibleDrawerProvider>
    </MemoryRouter>,
  )
}

describe('QuickActionsRow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    })
  })

  it('renders three quick action cards', () => {
    renderWithProviders()
    expect(screen.getByText('Browse Books')).toBeInTheDocument()
    expect(screen.getByText('My Bible')).toBeInTheDocument()
    expect(screen.getByText('Reading Plans')).toBeInTheDocument()
  })

  it('Browse Books is now a button, not a link', () => {
    renderWithProviders()
    const browseEl = screen.getByText('Browse Books').closest('button')
    expect(browseEl).toBeInTheDocument()
    expect(screen.getByText('Browse Books').closest('a')).toBeNull()
  })

  it('My Bible links to /bible/my', () => {
    renderWithProviders()
    const link = screen.getByText('My Bible').closest('a')
    expect(link?.getAttribute('href')).toBe('/bible/my')
  })

  it('Reading Plans links to /bible/plans', () => {
    renderWithProviders()
    const link = screen.getByText('Reading Plans').closest('a')
    expect(link?.getAttribute('href')).toBe('/bible/plans')
  })

  it('My Bible and Reading Plans remain as links', () => {
    renderWithProviders()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', '/bible/my')
    expect(links[1]).toHaveAttribute('href', '/bible/plans')
  })

  it('cards have minimum 44px tap targets', () => {
    const { container } = renderWithProviders()
    const cards = container.querySelectorAll('.min-h-\\[44px\\]')
    expect(cards.length).toBe(3)
  })

  it('logged-out user clicking My Bible opens auth modal with expected message', async () => {
    const user = userEvent.setup()
    renderWithProviders()
    const myBibleLink = screen.getByText('My Bible').closest('a')!
    await user.click(myBibleLink)
    expect(mockOpenAuthModal).toHaveBeenCalledWith(
      'Sign in to access your highlights, notes, and reading history.',
    )
  })

  it('logged-in user clicking My Bible does NOT open auth modal', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test', id: 't' },
      login: vi.fn(),
      logout: vi.fn(),
    })
    const user = userEvent.setup()
    renderWithProviders()
    const myBibleLink = screen.getByText('My Bible').closest('a')!
    await user.click(myBibleLink)
    expect(mockOpenAuthModal).not.toHaveBeenCalled()
  })

  it('Reading Plans click never opens auth modal regardless of auth state', async () => {
    const user = userEvent.setup()
    renderWithProviders()
    const plansLink = screen.getByText('Reading Plans').closest('a')!
    await user.click(plansLink)
    expect(mockOpenAuthModal).not.toHaveBeenCalled()
  })

  it('My Bible Link keeps its href for logged-out users (right-click/new-tab works)', () => {
    renderWithProviders()
    const myBibleLink = screen.getByText('My Bible').closest('a')
    expect(myBibleLink?.getAttribute('href')).toBe('/bible/my')
  })
})
