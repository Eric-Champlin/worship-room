import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { SharedVerse } from '../SharedVerse'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() }),
}))

vi.mock('@/hooks/useReducedMotion')
import { useReducedMotion } from '@/hooks/useReducedMotion'

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

beforeEach(() => {
  vi.mocked(useReducedMotion).mockReturnValue(false)
})

afterEach(() => {
  vi.useRealTimers()
})

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

  describe('KaraokeTextReveal Integration', () => {
    it('hero verse renders via KaraokeTextReveal', () => {
      const verse = getVerseOfTheDay(1)
      renderPage(verse.id)

      // First word of the verse should be in the DOM as a separate span
      const firstWord = verse.text.split(/\s+/)[0]
      expect(screen.getByText(firstWord)).toBeInTheDocument()
    })

    it('verse reference hidden until reveal completes', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const verse = getVerseOfTheDay(1)
      renderPage(verse.id)

      const reference = screen.getByText(new RegExp(verse.reference))
      expect(reference).toHaveClass('opacity-0')
    })

    it('verse reference visible after reveal', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const verse = getVerseOfTheDay(1)
      renderPage(verse.id)

      // After reveal duration (2500ms + 200ms buffer)
      act(() => {
        vi.advanceTimersByTime(2701)
      })

      const reference = screen.getByText(new RegExp(verse.reference))
      expect(reference).toHaveClass('opacity-100')
    })

    it('reduced motion shows verse and reference immediately', () => {
      vi.mocked(useReducedMotion).mockReturnValue(true)
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const verse = getVerseOfTheDay(1)
      renderPage(verse.id)

      // All words visible immediately
      const firstWord = verse.text.split(/\s+/)[0]
      expect(screen.getByText(firstWord).style.opacity).toBe('1')

      // onRevealComplete fires on next tick
      act(() => {
        vi.advanceTimersByTime(1)
      })
      const reference = screen.getByText(new RegExp(verse.reference))
      expect(reference).toHaveClass('opacity-100')
    })

    it('"not found" state unchanged', () => {
      renderPage('nonexistent-id')
      expect(screen.getByText('Verse not found')).toBeInTheDocument()
    })
  })
})
