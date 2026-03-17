import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { Churches } from '../Churches'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() }),
}))

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={['/local-support/churches']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
      <AuthModalProvider>
      <Churches />
      </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('Churches', () => {
  it('renders hero with "Find a Church Near You" heading', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { name: 'Find a Church Near You', level: 1 }),
    ).toBeInTheDocument()
  })

  it('renders search controls for logged-out users in teaser mode', () => {
    renderPage()
    expect(screen.getByLabelText('Use my current location')).toBeInTheDocument()
  })

  it('renders mock listing cards for logged-out users', () => {
    renderPage()
    expect(screen.getAllByText('First Baptist Church of Columbia').length).toBeGreaterThan(0)
  })
})
