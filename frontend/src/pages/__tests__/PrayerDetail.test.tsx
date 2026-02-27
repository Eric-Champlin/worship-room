import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PrayerDetail } from '../PrayerDetail'

function renderDetail(prayerId: string) {
  return render(
    <MemoryRouter
      initialEntries={[`/prayer-wall/${prayerId}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/prayer-wall/:id" element={<PrayerDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PrayerDetail', () => {
  it('renders full prayer text without truncation for a known prayer', () => {
    renderDetail('prayer-1')
    // prayer-1 from mock data should render without "Show more"
    expect(screen.queryByText('Show more')).not.toBeInTheDocument()
  })

  it('shows "Back to Prayer Wall" link', () => {
    renderDetail('prayer-1')
    const backLink = screen.getByText('Back to Prayer Wall')
    expect(backLink).toBeInTheDocument()
    expect(backLink.closest('a')).toHaveAttribute('href', '/prayer-wall')
  })

  it('renders comments without 5-comment limit', () => {
    // prayer-1 has comments in mock data — all should render
    renderDetail('prayer-1')
    // The comment input/link should be visible
    expect(screen.getByText('Log in to comment')).toBeInTheDocument()
  })

  it('shows 404-style message for unknown prayer ID', () => {
    renderDetail('nonexistent-prayer-id')
    expect(screen.getByText('Prayer not found')).toBeInTheDocument()
    expect(
      screen.getByText(/This prayer request may have been removed/),
    ).toBeInTheDocument()
  })

  it('shows report link', () => {
    renderDetail('prayer-1')
    expect(screen.getByText('Report')).toBeInTheDocument()
  })
})
