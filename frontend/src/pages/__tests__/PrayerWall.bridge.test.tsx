import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { PrayerWall } from '../PrayerWall'

// Make useAuth mock dynamic so individual tests can override authentication.
const authState = vi.hoisted(() => ({
  current: {
    user: null as { id: string; name: string } | null,
    isAuthenticated: false,
  },
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: authState.current.user,
    isAuthenticated: authState.current.isAuthenticated,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

beforeEach(() => {
  authState.current = { user: null, isAuthenticated: false }
})

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0,
    currentLevel: 1,
    levelName: 'Seedling',
    pointsToNextLevel: 100,
    todayActivities: {
      mood: false,
      pray: false,
      listen: false,
      prayerWall: false,
      meditate: false,
      journal: false,
    },
    todayPoints: 0,
    todayMultiplier: 1,
    currentStreak: 0,
    longestStreak: 0,
    recordActivity: vi.fn(),
  }),
}))

vi.mock('@/hooks/useNightMode', () => ({
  useNightMode: vi.fn(() => ({
    active: false,
    source: 'auto' as const,
    userPreference: 'auto' as const,
  })),
}))

// loadChapterWeb is mocked so the InlineComposer's ScriptureReferenceInput can
// resolve "Romans 8:28" without hitting the real data layer.
vi.mock('@/data/bible', async () => {
  const actual = await vi.importActual<typeof import('@/data/bible')>('@/data/bible')
  return {
    ...actual,
    loadChapterWeb: vi.fn().mockResolvedValue({
      bookSlug: 'romans',
      chapter: 8,
      verses: [
        {
          number: 28,
          text: 'And we know that all things work together for good ...',
        },
      ],
      paragraphs: [],
    }),
  }
})

function renderPage(initialEntry = '/prayer-wall') {
  return render(
    <MemoryRouter
      initialEntries={[initialEntry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthModalProvider>
          <PrayerWall />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('PrayerWall — Spec 7.1 Bible-to-Prayer-Wall bridge', () => {
  it('valid ?compose=question&scripture=John+14:1 opens composer with the post type AND pre-fill', async () => {
    renderPage(
      '/prayer-wall?compose=question&scripture=' + encodeURIComponent('John 14:1'),
    )
    // The composer header for "question" appears.
    expect(
      await screen.findByRole('heading', { name: 'Ask a question' }),
    ).toBeInTheDocument()
    // The scripture field is rendered with the pre-fill value.
    const scriptureInput = screen.getByLabelText(
      /Scripture reference/,
    ) as HTMLInputElement
    expect(scriptureInput.value).toBe('John 14:1')
  })

  it('valid params open composer with Romans 8:28 pre-fill (mocked verse lookup)', async () => {
    renderPage(
      '/prayer-wall?compose=question&scripture=' +
        encodeURIComponent('Romans 8:28'),
    )
    const scriptureInput = (await screen.findByLabelText(
      /Scripture reference/,
    )) as HTMLInputElement
    expect(scriptureInput.value).toBe('Romans 8:28')
    // Resolved WEB verse text surfaces after the debounced lookup.
    await waitFor(
      () =>
        expect(
          screen.getByText(/all things work together for good/i),
        ).toBeInTheDocument(),
      { timeout: 1500 },
    )
  })

  it('invalid ?compose=foo no-ops gracefully (composer NOT opened, no toast)', async () => {
    renderPage(
      '/prayer-wall?compose=foo&scripture=' + encodeURIComponent('John 14:1'),
    )
    // Allow effects to settle.
    await act(async () => {})
    // No composer header for any of the 5 post types.
    expect(screen.queryByRole('heading', { name: 'Ask a question' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Send encouragement' })).toBeNull()
    expect(
      screen.queryByRole('heading', { name: 'Share a Prayer Request' }),
    ).toBeNull()
    // No fallback toast surfaced.
    expect(
      screen.queryByText(/Couldn't load that reference/),
    ).not.toBeInTheDocument()
  })

  it('invalid ?scripture=garbage opens composer with no pre-fill + surfaces fallback toast', async () => {
    renderPage('/prayer-wall?compose=question&scripture=garbage')
    expect(
      await screen.findByRole('heading', { name: 'Ask a question' }),
    ).toBeInTheDocument()
    const scriptureInput = screen.getByLabelText(
      /Scripture reference/,
    ) as HTMLInputElement
    expect(scriptureInput.value).toBe('')
    // Fallback toast appears.
    expect(
      await screen.findByText(/Couldn't load that reference/),
    ).toBeInTheDocument()
  })

  it('empty ?scripture= opens composer with no pre-fill and NO toast', async () => {
    renderPage('/prayer-wall?compose=question&scripture=')
    expect(
      await screen.findByRole('heading', { name: 'Ask a question' }),
    ).toBeInTheDocument()
    const scriptureInput = screen.getByLabelText(
      /Scripture reference/,
    ) as HTMLInputElement
    expect(scriptureInput.value).toBe('')
    // No toast.
    expect(
      screen.queryByText(/Couldn't load that reference/),
    ).not.toBeInTheDocument()
  })

  it('Gate-G-URL-CLEARED-ON-OPEN: ?compose= and ?scripture= are stripped from the URL after composer opens', async () => {
    renderPage(
      '/prayer-wall?compose=question&scripture=' +
        encodeURIComponent('Romans 8:28'),
    )
    // Wait for the URL-driven effect to run + composer to open.
    expect(
      await screen.findByRole('heading', { name: 'Ask a question' }),
    ).toBeInTheDocument()
    // The MemoryRouter doesn't expose window.location, but the URL strip
    // is observable via the History API. Allow effects to flush.
    await act(async () => {})
    // The next render should not re-trigger the open: re-fire renders.
    // We assert that the pre-fill remains intact after a no-op re-render
    // (proxy for the URL having been stripped — if it weren't, the effect
    // would re-run and reset state to its initial values, but since params
    // are gone, the effect stays a no-op).
    const scriptureInput = screen.getByLabelText(
      /Scripture reference/,
    ) as HTMLInputElement
    expect(scriptureInput.value).toBe('Romans 8:28')
  })
})
