import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DailyHub } from '../DailyHub'

beforeEach(() => {
  localStorage.clear()
})

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={['/daily']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <DailyHub />
    </MemoryRouter>,
  )
}

describe('DailyHub', () => {
  it('renders a time-aware greeting with correct capitalization', () => {
    renderPage()
    const greeting = screen.getByText(/Good (Morning|Afternoon|Evening)/)
    expect(greeting).toBeInTheDocument()
  })

  it('renders the subtitle', () => {
    renderPage()
    expect(
      screen.getByText(/start with any practice below/i),
    ).toBeInTheDocument()
  })

  it('renders the Spotify embed with full-height player', () => {
    renderPage()
    const iframe = document.querySelector('iframe[title]') as HTMLIFrameElement
    expect(iframe).toBeInTheDocument()
    expect(iframe.getAttribute('height')).toBe('280')
  })

  it('renders 3 practice cards with correct labels', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Pray' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Journal' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Meditate' })).toBeInTheDocument()
  })

  it('practice cards link to correct routes', () => {
    renderPage()
    const links = screen.getAllByRole('link')
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('/pray')
    expect(hrefs).toContain('/journal')
    expect(hrefs).toContain('/meditate')
  })

  it('renders Follow Our Playlist CTA linking to Spotify', () => {
    renderPage()
    const cta = screen.getByRole('link', { name: /follow our playlist/i })
    expect(cta).toBeInTheDocument()
    expect(cta).toHaveAttribute('target', '_blank')
    expect(cta).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders Today\'s Song Pick heading', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { name: /today's song pick/i }),
    ).toBeInTheDocument()
  })

  it('does not show checkmarks when logged out', () => {
    renderPage()
    // useAuth returns isLoggedIn: false by default
    const checkmarks = screen.queryAllByText(/completed/i)
    expect(checkmarks).toHaveLength(0)
  })

  it('renders the Starting Point Quiz section', () => {
    renderPage()
    expect(document.getElementById('quiz')).toBeInTheDocument()
  })

  it('renders quiz teaser link in hero', () => {
    renderPage()
    expect(
      screen.getByRole('button', { name: /take a 30-second quiz/i }),
    ).toBeInTheDocument()
  })
})
