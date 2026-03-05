import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MeditateLanding } from '../MeditateLanding'

beforeEach(() => {
  localStorage.clear()
})

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={['/meditate']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <MeditateLanding />
    </MemoryRouter>,
  )
}

describe('MeditateLanding', () => {
  it('renders intro text', () => {
    renderPage()
    expect(
      screen.getByText(/take a moment to slow down/i),
    ).toBeInTheDocument()
  })

  it('renders 6 meditation cards', () => {
    renderPage()
    expect(screen.getByText('Breathing Exercise')).toBeInTheDocument()
    expect(screen.getByText('Scripture Soaking')).toBeInTheDocument()
    expect(screen.getByText('Gratitude Reflection')).toBeInTheDocument()
    expect(screen.getByText('ACTS Prayer Walk')).toBeInTheDocument()
    expect(screen.getByText('Psalm Reading')).toBeInTheDocument()
    expect(screen.getByText('Examen')).toBeInTheDocument()
  })

  it('meditation cards link to sub-routes', () => {
    renderPage()
    const links = screen.getAllByRole('link')
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('/meditate/breathing')
    expect(hrefs).toContain('/meditate/soaking')
    expect(hrefs).toContain('/meditate/gratitude')
    expect(hrefs).toContain('/meditate/acts')
    expect(hrefs).toContain('/meditate/psalms')
    expect(hrefs).toContain('/meditate/examen')
  })

  it('does not show all-6-complete celebration when none completed', () => {
    renderPage()
    expect(
      screen.queryByText(/you completed all 6 meditations/i),
    ).not.toBeInTheDocument()
  })

  it('does not show checkmarks when logged out', () => {
    renderPage()
    // useAuth returns isLoggedIn: false by default — no checkmarks should render
    const checkmarks = screen.queryAllByLabelText(/completed/i)
    expect(checkmarks).toHaveLength(0)
  })
})
