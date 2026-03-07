import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { PrayerWallDashboard } from '../PrayerWallDashboard'

// useAuth is NOT mocked here — returns default { isLoggedIn: false, user: null }

function LoginPage() {
  return <p>Login Page</p>
}

describe('PrayerWallDashboard (logged out)', () => {
  it('redirects to login when not logged in', () => {
    render(
      <MemoryRouter
        initialEntries={['/prayer-wall/dashboard']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ToastProvider>
        <AuthModalProvider>
        <Routes>
          <Route path="/prayer-wall/dashboard" element={<PrayerWallDashboard />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
        </AuthModalProvider>
        </ToastProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })
})
