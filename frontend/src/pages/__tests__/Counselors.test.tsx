import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { Counselors } from '../Counselors'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() }),
}))

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={['/local-support/counselors']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
      <AuthModalProvider>
      <Counselors />
      </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('Counselors', () => {
  it('renders hero with "Find a Christian Counselor" heading', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { name: 'Find a Christian Counselor', level: 1 }),
    ).toBeInTheDocument()
  })

  it('renders search controls for logged-out users in teaser mode', () => {
    renderPage()
    expect(screen.getByLabelText('Use my current location')).toBeInTheDocument()
  })

  it('renders mock listing cards for logged-out users', () => {
    renderPage()
    expect(screen.getAllByText('Restoration Christian Counseling').length).toBeGreaterThan(0)
  })
})
