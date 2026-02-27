import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { PrayerWall } from '../PrayerWall'

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={['/prayer-wall']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <PrayerWall />
    </MemoryRouter>,
  )
}

describe('PrayerWall', () => {
  it('renders hero with "Prayer Wall" heading', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { name: 'Prayer Wall', level: 1 }),
    ).toBeInTheDocument()
  })

  it('renders prayer cards from mock data', () => {
    renderPage()
    // Should render prayer cards as articles
    const articles = screen.getAllByRole('article')
    expect(articles.length).toBeGreaterThan(0)
  })

  it('"Share a Prayer Request" button is visible', () => {
    renderPage()
    // At least one "Share a Prayer Request" element should exist
    const buttons = screen.getAllByText('Share a Prayer Request')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('Pray button toggles and updates count', async () => {
    const user = userEvent.setup()
    renderPage()
    // Find the first pray button
    const prayButtons = screen.getAllByLabelText(/praying for this request/i)
    const firstBtn = prayButtons[0]
    const countBefore = firstBtn.textContent

    await user.click(firstBtn)
    const countAfter = firstBtn.textContent
    // Count should have changed
    expect(countAfter).not.toBe(countBefore)
  })

  it('cards have correct accessible landmarks', () => {
    renderPage()
    // Prayer cards are rendered as <article> elements
    const articles = screen.getAllByRole('article')
    expect(articles.length).toBeGreaterThan(0)
    // Hero section has an aria-label
    expect(screen.getByRole('region', { name: 'Prayer Wall' })).toBeInTheDocument()
  })

  it('renders skip to content link', () => {
    renderPage()
    expect(screen.getByText('Skip to content')).toBeInTheDocument()
  })
})
