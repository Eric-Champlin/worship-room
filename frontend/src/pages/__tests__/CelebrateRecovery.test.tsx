import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CelebrateRecovery } from '../CelebrateRecovery'

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={['/local-support/celebrate-recovery']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <CelebrateRecovery />
    </MemoryRouter>,
  )
}

describe('CelebrateRecovery', () => {
  it('renders hero with "Find Celebrate Recovery" heading', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { name: 'Find Celebrate Recovery', level: 1 }),
    ).toBeInTheDocument()
  })

  it('renders CR explainer section', () => {
    renderPage()
    expect(screen.getByText(/what is celebrate recovery\?/i)).toBeInTheDocument()
    expect(screen.getByText(/christ-centered, 12-step recovery program/i)).toBeInTheDocument()
  })

  it('shows "Sign In to Search" CTA for logged-out users', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Sign In to Search' })).toBeInTheDocument()
  })

  it('does not render search controls for logged-out users', () => {
    renderPage()
    expect(screen.queryByRole('button', { name: /use my location/i })).not.toBeInTheDocument()
  })
})
