import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn().mockReturnValue({ isOnline: false }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

import { AskPage } from '../AskPage'

function renderPage(initialRoute = '/ask') {
  return render(
    <MemoryRouter
      initialEntries={[initialRoute]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthModalProvider>
          <Routes>
            <Route path="/ask" element={<AskPage />} />
          </Routes>
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

describe('AskPage offline', () => {
  it('shows OfflineNotice when offline', () => {
    renderPage()
    expect(screen.getByText("You're offline")).toBeInTheDocument()
    expect(
      screen.getByText(/Ask needs an internet connection/),
    ).toBeInTheDocument()
  })

  it('shows fallback CTA to Bible when offline', () => {
    renderPage()
    expect(screen.getByRole('link', { name: /Read the Bible/ })).toBeInTheDocument()
  })

  it('does not render the Ask page hero when offline', () => {
    renderPage()
    expect(
      screen.queryByRole('heading', { name: "Ask God's Word" }),
    ).not.toBeInTheDocument()
  })
})
