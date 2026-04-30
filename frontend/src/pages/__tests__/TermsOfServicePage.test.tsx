import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TermsOfServicePage } from '@/pages/TermsOfServicePage'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null }),
}))
vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => ({ isOnline: true }),
}))
vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  AuthModalProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuthModal: () => null,
}))
vi.mock('@/lib/audio', () => ({
  AudioProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAudio: () => ({ state: { isPlaying: false, drawerOpen: false }, dispatch: vi.fn() }),
}))
vi.mock('@/components/SEO', () => ({
  SEO: () => null,
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/terms-of-service']}>
      <TermsOfServicePage />
    </MemoryRouter>,
  )
}

describe('TermsOfServicePage', () => {
  it('renders the title', () => {
    renderPage()
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /worship room terms of service/i,
      }),
    ).toBeInTheDocument()
  })

  it('renders at least one section heading', () => {
    renderPage()
    const h2s = screen.getAllByRole('heading', { level: 2 })
    expect(h2s.length).toBeGreaterThan(0)
  })
})
