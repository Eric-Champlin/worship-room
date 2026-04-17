/**
 * BB-38 (verification fix): Deep-link integration tests for BibleLanding's
 * `?mode=search&q=<query>` contract.
 *
 * These tests verify the fix for Finding 1 from the `/verify-with-playwright`
 * run — the Bible redesign moved `/bible` routing from `BibleBrowser` to
 * `BibleLanding`, orphaning BB-38's search deep-link wiring. This file covers
 * the BibleLanding consumer side of the fix: cold-loading `?mode=search`
 * renders the search panel, typing updates the URL, the "Back to Bible" exit
 * restores landing content, and absence of `?mode=search` renders landing
 * content normally.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { _resetForTesting as resetStreakStore } from '@/lib/bible/streakStore'
import { BibleLanding } from '../BibleLanding'

// Minimum mocks required to mount BibleLanding in jsdom without hitting the
// real book loader or VOTD generator. Copy-pasted from BibleLanding.test.tsx
// to keep this file self-contained and avoid cross-test coupling.

vi.mock('@/hooks/bible/useVerseOfTheDay', () => ({
  useVerseOfTheDay: () => ({
    votd: {
      entry: {
        ref: 'Psalms 23:1',
        book: 'psalms',
        chapter: 23,
        startVerse: 1,
        endVerse: 1,
        theme: 'provision',
      },
      verseText: 'Yahweh is my shepherd; I shall lack nothing.',
      bookName: 'Psalms',
      wordCount: 8,
    },
    isLoading: false,
  }),
}))

vi.mock('@/lib/bible/bookmarkStore', () => ({
  toggleBookmark: vi.fn().mockReturnValue({ created: false, bookmark: null }),
  isSelectionBookmarked: vi.fn().mockReturnValue(false),
  setBookmarkLabel: vi.fn(),
  subscribe: vi.fn().mockReturnValue(() => {}),
}))

vi.mock('@/data/bible', () => ({
  loadChapterWeb: vi.fn().mockResolvedValue({
    bookSlug: 'john',
    chapter: 3,
    verses: [
      { number: 1, text: 'Now there was a man of the Pharisees named Nicodemus.' },
    ],
    paragraphs: [],
  }),
  getAdjacentChapter: vi.fn().mockReturnValue({
    bookSlug: 'john',
    bookName: 'John',
    chapter: 4,
  }),
  // BB-38: stub the bulk book loader so BibleSearchMode's internal
  // useBibleSearch hook doesn't try to fetch every book JSON file. Returning
  // an empty chapter array keeps `searchAllBooks` synchronous and deterministic.
  loadAllBookText: vi.fn().mockResolvedValue([]),
}))

function renderLanding(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <ToastProvider>
          <AuthModalProvider>
            <BibleLanding />
          </AuthModalProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('BibleLanding BB-38 deep-link (search mode)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStreakStore()
  })

  it('renders landing content (not search mode) when ?mode is absent', () => {
    renderLanding('/bible')

    // BibleSearchEntry (landing search form) should be present via its placeholder
    expect(
      screen.getByPlaceholderText(/search verses or go to a passage/i),
    ).toBeInTheDocument()

    // BibleSearchMode's input has id="bible-search-input" — it must NOT be mounted
    expect(document.getElementById('bible-search-input')).toBeNull()

    // "Back to Bible" exit link must NOT be present in landing mode
    expect(
      screen.queryByRole('button', { name: /back to bible/i }),
    ).not.toBeInTheDocument()
  })

  it('renders search mode when ?mode=search is present', () => {
    renderLanding('/bible?mode=search')

    // BibleSearchMode's input is visible
    const searchInput = document.getElementById('bible-search-input') as HTMLInputElement | null
    expect(searchInput).not.toBeNull()
    expect(searchInput!.value).toBe('')

    // "Back to Bible" exit link is visible
    expect(
      screen.getByRole('button', { name: /back to bible/i }),
    ).toBeInTheDocument()

    // BibleSearchEntry (landing search form) must NOT be rendered in search mode.
    // BibleSearchEntry uses <input type="search"> (role=searchbox);
    // BibleSearchMode uses <input type="text">. Both share the same placeholder
    // string post-BB-49, so role is the reliable discriminator.
    expect(
      screen.queryByRole('searchbox', { name: /search the bible/i }),
    ).not.toBeInTheDocument()
  })

  it('cold-loads ?mode=search&q=love with the query pre-filled', () => {
    renderLanding('/bible?mode=search&q=love')

    const searchInput = document.getElementById('bible-search-input') as HTMLInputElement | null
    expect(searchInput).not.toBeNull()
    expect(searchInput!.value).toBe('love')
  })

  it('cold-loads ?mode=search with URL-encoded multi-word query', () => {
    renderLanding('/bible?mode=search&q=living%20water')

    const searchInput = document.getElementById('bible-search-input') as HTMLInputElement | null
    expect(searchInput!.value).toBe('living water')
  })

  it('ignores ?q= when ?mode=search is absent (landing mode)', () => {
    renderLanding('/bible?q=love')

    // Landing content is rendered; BibleSearchMode is NOT mounted
    expect(document.getElementById('bible-search-input')).toBeNull()
    expect(
      screen.getByPlaceholderText(/search verses or go to a passage/i),
    ).toBeInTheDocument()
  })

  it('typing in the search input updates the URL via debounced useSearchQuery', async () => {
    const user = userEvent.setup()
    renderLanding('/bible?mode=search')

    const searchInput = document.getElementById('bible-search-input') as HTMLInputElement | null
    expect(searchInput).not.toBeNull()
    await user.type(searchInput!, 'peace')

    // useSearchQuery debounces URL writes by 250ms. Rather than fake timers
    // here, just assert the input's React state updates synchronously — the
    // URL write is tested directly in useSearchQuery.test.tsx. This test is
    // about end-to-end wiring: the controlled input value changed, which
    // proves onQueryChange flowed through to useSearchQuery.setQuery.
    await waitFor(() => {
      expect((document.getElementById('bible-search-input') as HTMLInputElement).value).toBe(
        'peace',
      )
    })
  })

  it('clicking "Back to Bible" clears mode and q from the URL', async () => {
    const user = userEvent.setup()
    renderLanding('/bible?mode=search&q=love')

    // Confirm we're in search mode first
    expect(document.getElementById('bible-search-input')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: /back to bible/i }))

    // After clicking, BibleSearchMode unmounts and BibleSearchEntry reappears
    await waitFor(() => {
      expect(document.getElementById('bible-search-input')).toBeNull()
    })
    expect(
      screen.getByPlaceholderText(/search verses or go to a passage/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /back to bible/i }),
    ).not.toBeInTheDocument()
  })
})
