import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { Home } from '@/pages/Home'

function renderHome() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Home />
    </MemoryRouter>
  )
}

describe('Home', () => {
  it('renders the hero heading', () => {
    renderHome()
    expect(
      screen.getByRole('heading', { level: 1, name: /how're you feeling today/i })
    ).toBeInTheDocument()
  })

  it('renders the main content landmark', () => {
    renderHome()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('renders skip-to-content link', () => {
    renderHome()
    const skipLink = screen.getByText('Skip to content')
    expect(skipLink).toHaveAttribute('href', '#main-content')
  })

  it('renders the navbar', () => {
    renderHome()
    expect(
      screen.getByRole('navigation', { name: /main navigation/i })
    ).toBeInTheDocument()
  })

  it('renders the footer', () => {
    renderHome()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('renders all landing page sections', () => {
    renderHome()
    // Hero
    expect(
      screen.getByRole('region', { name: /welcome to worship room/i })
    ).toBeInTheDocument()
    // Journey
    expect(
      screen.getByRole('region', { name: /your journey to/i })
    ).toBeInTheDocument()
    // Growth Teasers
    expect(
      screen.getByRole('region', { name: /see how you're growing/i })
    ).toBeInTheDocument()
    // Quiz
    expect(
      screen.getByRole('region', { name: /not sure where to start/i })
    ).toBeInTheDocument()
  })
})
