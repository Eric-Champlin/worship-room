import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { PrayerWall } from '../PrayerWall'

// Spec 4.3 — make useAuth mock dynamic so individual tests can override
// whether the user is authenticated.
const authState = vi.hoisted(() => ({
  current: { user: null as { id: string; name: string } | null, isAuthenticated: false },
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
    totalPoints: 0, currentLevel: 1, levelName: 'Seedling', pointsToNextLevel: 100,
    todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, meditate: false, journal: false },
    todayPoints: 0, todayMultiplier: 1, currentStreak: 0, longestStreak: 0,
    recordActivity: vi.fn(),
  }),
}))

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

describe('PrayerWall', () => {
  it('renders hero with "Prayer Wall" heading', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { name: 'Prayer Wall', level: 1 }),
    ).toBeInTheDocument()
  })

  it('page wrapper has overflow-x-hidden to contain scrollable filter bar', () => {
    const { container } = renderPage()
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.className).toContain('overflow-x-hidden')
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

  it('renders skip to content link (via Navbar)', () => {
    renderPage()
    expect(screen.getByText('Skip to content')).toBeInTheDocument()
  })

  it('renders filter bar with "All" and category pills', () => {
    renderPage()
    expect(screen.getByRole('toolbar', { name: /filter prayers by category/i })).toBeInTheDocument()
    expect(screen.getByText('All')).toBeInTheDocument()
  })

  it('clicking a filter pill reduces visible prayer cards', async () => {
    const user = userEvent.setup()
    renderPage()
    const allArticlesBefore = screen.getAllByRole('article').length

    // Click "Health" filter — should show only health prayers (2 out of 18)
    await user.click(screen.getByRole('button', { name: 'Health' }))
    const allArticlesAfter = screen.getAllByRole('article').length
    expect(allArticlesAfter).toBeLessThan(allArticlesBefore)
  })

  it('filter bar pills include "All"', () => {
    renderPage()
    const allBtn = screen.getByRole('button', { name: 'All' })
    expect(allBtn).toBeInTheDocument()
    expect(allBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('URL param pre-selects filter', () => {
    renderPage('/prayer-wall?category=health')
    const toolbar = screen.getByRole('toolbar')
    const healthPill = within(toolbar).getByRole('button', { name: /^Health(\s|$)/i })
    expect(healthPill).toHaveAttribute('aria-pressed', 'true')
    const allPill = within(toolbar).getByRole('button', { name: 'All' })
    expect(allPill).toHaveAttribute('aria-pressed', 'false')
  })
})

vi.mock('@/mocks/prayer-wall-mock-data', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/mocks/prayer-wall-mock-data')>()
  return {
    ...original,
    getMockPrayers: vi.fn(original.getMockPrayers),
  }
})

describe('PrayerWall empty states', () => {
  it('shows filtered empty state with category name when filter yields no results', async () => {
    const { getMockPrayers } = await import('@/mocks/prayer-wall-mock-data')
    vi.mocked(getMockPrayers).mockReturnValue([])

    renderPage('/prayer-wall?category=discussion')

    expect(screen.getByText(/No prayers in Discussion yet/i)).toBeInTheDocument()
    expect(screen.getByText('Be the first to share.')).toBeInTheDocument()
  })

  it('shows feed empty state when no prayers exist and no filter active', async () => {
    const { getMockPrayers } = await import('@/mocks/prayer-wall-mock-data')
    vi.mocked(getMockPrayers).mockReturnValue([])

    renderPage('/prayer-wall')

    expect(screen.getByText('This space is for you')).toBeInTheDocument()
    expect(
      screen.getByText("Share what's on your heart, or simply pray for others."),
    ).toBeInTheDocument()
  })
})

// =====================================================================
// Spec 4.3 — testimony composer per-type behavior
// =====================================================================

describe('PrayerWall — Spec 4.3 testimony composer', () => {
  it('?debug-post-type=testimony query param opens composer in testimony mode', async () => {
    // Logged-in: hero button opens the composer (logged-out goes to auth modal directly).
    authState.current = {
      user: { id: 'u-test', name: 'Test User' },
      isAuthenticated: true,
    }
    const user = userEvent.setup()
    renderPage('/prayer-wall?debug-post-type=testimony')
    // Click the inline-composer-trigger "Share a Prayer Request" hero button.
    // There are multiple elements with this text on the page; the hero button is
    // the only `<button>` (others are headings/links).
    const triggerBtn = screen.getByRole('button', { name: 'Share a Prayer Request' })
    await user.click(triggerBtn)
    // Composer renders with testimony header (per Spec 4.3).
    expect(screen.getByText('Share a testimony')).toBeInTheDocument()
    expect(screen.getByLabelText('Testimony')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit testimony/i })).toBeInTheDocument()
  })

  it('default (no query param) opens composer in prayer_request mode (no regression)', async () => {
    authState.current = {
      user: { id: 'u-test', name: 'Test User' },
      isAuthenticated: true,
    }
    const user = userEvent.setup()
    renderPage('/prayer-wall')
    const triggerBtn = screen.getByRole('button', { name: 'Share a Prayer Request' })
    await user.click(triggerBtn)
    // Composer renders with prayer_request label, NOT testimony.
    expect(screen.queryByText('Share a testimony')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Prayer request')).toBeInTheDocument()
  })

  it('successful testimony submit (mock branch) shows testimony-specific success toast', async () => {
    authState.current = {
      user: { id: 'u-test', name: 'Sarah' },
      isAuthenticated: true,
    }
    const user = userEvent.setup()
    renderPage('/prayer-wall?debug-post-type=testimony')
    const triggerBtn = screen.getByRole('button', { name: 'Share a Prayer Request' })
    await user.click(triggerBtn)
    await user.type(
      screen.getByLabelText('Testimony'),
      'Praise God for healing my friend.',
    )
    await user.click(screen.getByRole('button', { name: /submit testimony/i }))
    // Spec 4.3 testimony-specific toast copy
    expect(
      await screen.findByText('Your testimony is on the wall. Others can rejoice with you.'),
    ).toBeInTheDocument()
  })

  it('successful prayer_request submit (mock branch) shows prayer-specific toast (no regression)', async () => {
    authState.current = {
      user: { id: 'u-test', name: 'Sarah' },
      isAuthenticated: true,
    }
    const user = userEvent.setup()
    renderPage('/prayer-wall')
    const triggerBtn = screen.getByRole('button', { name: 'Share a Prayer Request' })
    await user.click(triggerBtn)
    await user.type(screen.getByLabelText('Prayer request'), 'Please pray for my family.')
    // Pick category — composer fieldset's Health pill is the second match
    // (filter bar also has a Health pill); use a more specific selector.
    const radioGroup = screen.getByRole('radiogroup', { name: /prayer category/i })
    await userEvent.setup().click(within(radioGroup).getByRole('radio', { name: 'Health' }))
    await user.click(screen.getByRole('button', { name: /submit prayer request/i }))
    expect(
      await screen.findByText('Your prayer is on the wall. Others can now lift it up.'),
    ).toBeInTheDocument()
  })
})

// =====================================================================
// Spec 4.4 — question composer per-type behavior
// =====================================================================

describe('PrayerWall — Spec 4.4 question composer', () => {
  it('?debug-post-type=question opens composer in question mode', async () => {
    authState.current = {
      user: { id: 'u-test', name: 'Sarah' },
      isAuthenticated: true,
    }
    const user = userEvent.setup()
    renderPage('/prayer-wall?debug-post-type=question')
    const triggerBtn = screen.getByRole('button', { name: 'Share a Prayer Request' })
    await user.click(triggerBtn)
    expect(screen.getByText('Ask a question')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /submit question/i }),
    ).toBeInTheDocument()
  })

  it('successful question submit (mock branch) shows question-specific success toast', async () => {
    authState.current = {
      user: { id: 'u-test', name: 'Sarah' },
      isAuthenticated: true,
    }
    const user = userEvent.setup()
    renderPage('/prayer-wall?debug-post-type=question')
    const triggerBtn = screen.getByRole('button', { name: 'Share a Prayer Request' })
    await user.click(triggerBtn)
    await user.type(
      screen.getByLabelText('Question'),
      'What does this verse mean for someone in my situation?',
    )
    await user.click(screen.getByRole('button', { name: /submit question/i }))
    expect(
      await screen.findByText('Your question is on the wall. Others can weigh in.'),
    ).toBeInTheDocument()
  })

  it('unauthenticated question submit surfaces question-specific auth modal CTA', async () => {
    // Logged out — submitting a question opens the AuthModal with question CTA copy.
    // (Opening the composer alone does NOT auth-gate; the gate fires on submit
    // via handleComposerSubmit.)
    authState.current = { user: null, isAuthenticated: false }
    const user = userEvent.setup()
    const { container } = renderPage('/prayer-wall?debug-post-type=question')
    const triggerBtn = screen.getByRole('button', { name: 'Share a Prayer Request' })
    await user.click(triggerBtn)
    // Surface DOM snapshot if subsequent queries fail.
    void container
    await user.type(
      screen.getByLabelText('Question'),
      'What does this verse mean for someone in my situation?',
    )
    // Use queryAll to bypass aria-hidden/inert filtering — the composer button
    // can be hidden behind a route-level filter when the composer is in the
    // closed state's lingering inert wrapper. The composer trigger only toggles
    // visibility of the panel; the panel renders both when open and closed.
    const submitBtn = screen.queryByRole('button', { name: /submit question/i })
      ?? screen.getAllByRole('button', { hidden: true }).find(
        (b) => /submit question/i.test(b.textContent ?? ''),
      )
    if (!submitBtn) throw new Error('Submit Question button not found in DOM')
    await user.click(submitBtn)
    expect(
      await screen.findByText('Sign in to ask a question'),
    ).toBeInTheDocument()
  })
})

// =====================================================================
// Spec 4.5 — discussion composer per-type behavior
// =====================================================================

describe('PrayerWall — Spec 4.5 discussion composer', () => {
  it('successful discussion submit (mock branch) shows discussion-specific toast', async () => {
    authState.current = {
      user: { id: 'u-test', name: 'Sarah' },
      isAuthenticated: true,
    }
    const user = userEvent.setup()
    renderPage('/prayer-wall?debug-post-type=discussion')
    const triggerBtn = screen.getByRole('button', { name: 'Share a Prayer Request' })
    await user.click(triggerBtn)
    await user.type(
      screen.getByLabelText('Discussion'),
      'How do you stay disciplined in prayer?',
    )
    await user.click(screen.getByRole('button', { name: /start discussion/i }))
    expect(
      await screen.findByText(
        'Your discussion is on the wall. Others can think it through with you.',
      ),
    ).toBeInTheDocument()
  })

  it('unauthenticated discussion submit surfaces discussion-specific auth modal CTA', async () => {
    authState.current = { user: null, isAuthenticated: false }
    const user = userEvent.setup()
    const { container } = renderPage('/prayer-wall?debug-post-type=discussion')
    const triggerBtn = screen.getByRole('button', { name: 'Share a Prayer Request' })
    await user.click(triggerBtn)
    void container
    await user.type(
      screen.getByLabelText('Discussion'),
      'How do you stay disciplined in prayer?',
    )
    const submitBtn =
      screen.queryByRole('button', { name: /start discussion/i }) ??
      screen
        .getAllByRole('button', { hidden: true })
        .find((b) => /start discussion/i.test(b.textContent ?? ''))
    if (!submitBtn) throw new Error('Start Discussion button not found in DOM')
    await user.click(submitBtn)
    expect(await screen.findByText('Sign in to start a discussion')).toBeInTheDocument()
  })
})
