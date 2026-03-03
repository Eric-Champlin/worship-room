import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Churches } from '../Churches'

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={['/local-support/churches']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Churches />
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

  it('shows "Sign In to Search" CTA for logged-out users', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Sign In to Search' })).toBeInTheDocument()
  })

  it('does not render search controls for logged-out users', () => {
    renderPage()
    expect(screen.queryByRole('button', { name: /use my location/i })).not.toBeInTheDocument()
  })
})
