import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { SharedVerse } from '../SharedVerse'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() }),
}))
import { getVerseOfTheDay } from '@/mocks/daily-experience-mock-data'

function renderPage(id: string) {
  return render(
    <MemoryRouter
      initialEntries={[`/verse/${id}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/verse/:id" element={<SharedVerse />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SharedVerse', () => {
  it('renders verse text for a valid ID', () => {
    const verse = getVerseOfTheDay(1)
    renderPage(verse.id)
    expect(screen.getByText(new RegExp(verse.reference))).toBeInTheDocument()
  })

  it('shows "Verse not found" for invalid ID', () => {
    renderPage('nonexistent-id')
    expect(screen.getByText('Verse not found')).toBeInTheDocument()
  })

  it('renders Spotify embed', () => {
    const verse = getVerseOfTheDay(1)
    renderPage(verse.id)
    const iframe = document.querySelector('iframe')
    expect(iframe).toBeInTheDocument()
  })

  it('renders "Explore Worship Room" CTA', () => {
    const verse = getVerseOfTheDay(1)
    renderPage(verse.id)
    expect(screen.getByText(/explore worship room/i)).toBeInTheDocument()
  })

  it('renders "Start your daily time with God" CTA', () => {
    const verse = getVerseOfTheDay(1)
    renderPage(verse.id)
    expect(
      screen.getByText(/start your daily time with god/i),
    ).toBeInTheDocument()
  })

  it('renders "Follow our playlist on Spotify" link', () => {
    const verse = getVerseOfTheDay(1)
    renderPage(verse.id)
    // May appear in both the page content and the footer
    const matches = screen.getAllByText(/follow our playlist on spotify/i)
    expect(matches.length).toBeGreaterThan(0)
  })
})
