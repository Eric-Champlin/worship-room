import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { Insights } from '@/pages/Insights'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() }),
}))

function renderInsights() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Insights />
    </MemoryRouter>
  )
}

describe('Insights', () => {
  it('renders the page heading', () => {
    renderInsights()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Reflect' })
    ).toBeInTheDocument()
  })

  it('renders the description text', () => {
    renderInsights()
    expect(
      screen.getByText(/track your spiritual journey and discover patterns/i)
    ).toBeInTheDocument()
  })

  it('renders the Coming Soon indicator', () => {
    renderInsights()
    expect(screen.getByText('Coming Soon')).toBeInTheDocument()
  })
})
