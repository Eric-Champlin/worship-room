import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

// Spec 6.3 — useNightMode mock with default 'day-state' return. Individual
// Night Mode tests below override via vi.mocked(useNightMode).mockReturnValue.
vi.mock('@/hooks/useNightMode', () => ({
  useNightMode: vi.fn(() => ({
    active: false,
    source: 'auto' as const,
    userPreference: 'auto' as const,
  })),
}))
import { useNightMode } from '@/hooks/useNightMode'

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

  it('page wrapper has overflow-x-clip to contain scrollable filter bar without trapping sticky', () => {
    const { container } = renderPage()
    const wrapper = container.firstElementChild as HTMLElement
    // BackgroundCanvas owns the horizontal-clip constraint via overflow-x-clip.
    // overflow-x-hidden was removed from PrayerWall's pass-through className
    // (redundant + would create a scroll container that traps sticky descendants).
    expect(wrapper.className).toContain('overflow-x-clip')
    expect(wrapper.className).not.toContain('overflow-x-hidden')
    expect(wrapper.className).not.toContain('overflow-hidden')
  })

  it('renders prayer cards from mock data', () => {
    renderPage()
    // Should render prayer cards as articles
    const articles = screen.getAllByRole('article')
    expect(articles.length).toBeGreaterThan(0)
  })

  it('"Share something" button is visible', () => {
    renderPage()
    // At least one "Share something" element should exist
    const buttons = screen.getAllByText('Share something')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('Spec 5.5 — Share Something hero CTA renders as Button variant="subtle" (rounded-full frosted pill)', () => {
    renderPage()
    const cta = screen.getAllByRole('button', { name: 'Share something' })[0]
    // Button variant="subtle" canonical chrome
    expect(cta.className).toContain('rounded-full')
    expect(cta.className).toContain('bg-white/[0.07]')
    expect(cta.className).toContain('border-white/[0.12]')
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

  // Prayer Wall Redesign (2026-05-13) — the legacy CategoryFilterBar toolbar
  // (role="toolbar", name "Filter prayers by category") was replaced by the
  // new CategoryFilters nav (role="navigation", name "Filter prayer wall posts").
  // Tests migrated to the new selectors; behavioral coverage is preserved.
  it('renders filter nav with All posts and topic pills', () => {
    renderPage()
    const navs = screen.getAllByRole('navigation', {
      name: /filter prayer wall posts/i,
    })
    expect(navs.length).toBeGreaterThan(0)
    // At least one nav contains the "All posts" desktop label or "All" chip.
    const found = navs.some((nav) =>
      within(nav).queryByRole('button', { name: /^all(\s+posts)?$/i }),
    )
    expect(found).toBe(true)
  })

  it('clicking a topic filter reduces visible prayer cards', async () => {
    const user = userEvent.setup()
    renderPage()
    const allArticlesBefore = screen.getAllByRole('article').length

    // Click "Health" filter — multiple instances exist (desktop + mobile);
    // click the first.
    const healthButtons = screen.getAllByRole('button', { name: 'Health' })
    await user.click(healthButtons[0])
    const allArticlesAfter = screen.getAllByRole('article').length
    expect(allArticlesAfter).toBeLessThan(allArticlesBefore)
  })

  it('All filter is pressed by default', () => {
    renderPage()
    const allButtons = screen.getAllByRole('button', { name: /^all(\s+posts)?$/i })
    expect(allButtons.length).toBeGreaterThan(0)
    expect(allButtons[0]).toHaveAttribute('aria-pressed', 'true')
  })

  it('URL ?category=health pre-selects Health filter', () => {
    renderPage('/prayer-wall?category=health')
    const healthButtons = screen.getAllByRole('button', { name: /^Health$/i })
    expect(healthButtons.length).toBeGreaterThan(0)
    expect(healthButtons[0]).toHaveAttribute('aria-pressed', 'true')
    const allButtons = screen.getAllByRole('button', { name: /^all(\s+posts)?$/i })
    expect(allButtons[0]).toHaveAttribute('aria-pressed', 'false')
  })

  // Prayer Wall Redesign (2026-05-13) — page-level integration coverage for the
  // unified CategoryFilters component (replaces the skipped Spec 4.8 dual-filter
  // tests, which assumed multi-axis preservation that contradicts the new
  // D-CategorySingleSelect contract). Component-level coverage lives in
  // CategoryFilters.test.tsx; these tests verify the end-to-end wiring (filter
  // click → handleSelectCategory/PostType → URL params + feed filter).
  it('clicking a post-type filter pre-selects via URL param', () => {
    renderPage('/prayer-wall?postType=testimony')
    const testimoniesBtns = screen.getAllByRole('button', { name: /^Testimonies$/i })
    expect(testimoniesBtns[0]).toHaveAttribute('aria-pressed', 'true')
    const allBtns = screen.getAllByRole('button', { name: /^all(\s+posts)?$/i })
    expect(allBtns[0]).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking a topic filter while a post-type is active clears the post-type axis (single-select)', async () => {
    const user = userEvent.setup()
    renderPage('/prayer-wall?postType=prayer_request')
    // Pre-condition: prayer_request pressed.
    const prayerReqBtns = screen.getAllByRole('button', { name: /^Prayer requests$/i })
    expect(prayerReqBtns[0]).toHaveAttribute('aria-pressed', 'true')

    // Click a topic — single-select policy clears the post-type axis.
    const familyBtns = screen.getAllByRole('button', { name: /^Family$/i })
    await user.click(familyBtns[0])

    expect(familyBtns[0]).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getAllByRole('button', { name: /^Prayer requests$/i })[0],
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking "All posts" clears both filter axes', async () => {
    const user = userEvent.setup()
    renderPage('/prayer-wall?category=health')
    expect(
      screen.getAllByRole('button', { name: /^Health$/i })[0],
    ).toHaveAttribute('aria-pressed', 'true')

    const allBtns = screen.getAllByRole('button', { name: /^all(\s+posts)?$/i })
    await user.click(allBtns[0])

    expect(
      screen.getAllByRole('button', { name: /^all(\s+posts)?$/i })[0],
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getAllByRole('button', { name: /^Health$/i })[0],
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('Spec 7.2 — ScriptureChip on a feed card links with both ?scroll-to= and ?verse=', () => {
    renderPage()
    // Mock fixture id: 'prayer-discussion-with-scripture' carries
    // scriptureReference: 'Romans 8:28'. The chip is a <Link> with aria-label
    // "Read Romans 8:28 in the Bible".
    const chip = screen.getByRole('link', { name: /Read Romans 8:28 in the Bible/ })
    const href = chip.getAttribute('href') ?? ''
    expect(href).toContain('scroll-to=28')
    expect(href).toContain('verse=28')
    expect(href.startsWith('/bible/romans/8')).toBe(true)
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
  it('chooser opens InlineComposer in testimony mode after testimony card click', async () => {
    authState.current = {
      user: { id: 'u-test', name: 'Test User' },
      isAuthenticated: true,
    }
    const user = userEvent.setup()
    renderPage('/prayer-wall')
    // Open the chooser via the hero "Share something" button.
    await user.click(screen.getAllByRole('button', { name: 'Share something' })[0])
    // Pick the Testimony card from the chooser.
    await user.click(screen.getByRole('button', { name: 'Testimony' }))
    // Composer renders with testimony header (per Spec 4.3).
    expect(screen.getByText('Share a testimony')).toBeInTheDocument()
    expect(screen.getByLabelText('Testimony')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit testimony/i })).toBeInTheDocument()
  })

  it('chooser opens InlineComposer in prayer_request mode after prayer_request card click', async () => {
    authState.current = {
      user: { id: 'u-test', name: 'Test User' },
      isAuthenticated: true,
    }
    const user = userEvent.setup()
    renderPage('/prayer-wall')
    await user.click(screen.getAllByRole('button', { name: 'Share something' })[0])
    await user.click(screen.getByRole('button', { name: 'Prayer request' }))
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
    renderPage('/prayer-wall')
    await user.click(screen.getAllByRole('button', { name: 'Share something' })[0])
    await user.click(screen.getByRole('button', { name: 'Testimony' }))
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
    await user.click(screen.getAllByRole('button', { name: 'Share something' })[0])
    await user.click(screen.getByRole('button', { name: 'Prayer request' }))
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
  it('chooser opens InlineComposer in question mode after question card click', async () => {
    authState.current = {
      user: { id: 'u-test', name: 'Sarah' },
      isAuthenticated: true,
    }
    const user = userEvent.setup()
    renderPage('/prayer-wall')
    await user.click(screen.getAllByRole('button', { name: 'Share something' })[0])
    await user.click(screen.getByRole('button', { name: 'Question' }))
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
    renderPage('/prayer-wall')
    await user.click(screen.getAllByRole('button', { name: 'Share something' })[0])
    await user.click(screen.getByRole('button', { name: 'Question' }))
    await user.type(
      screen.getByLabelText('Question'),
      'What does this verse mean for someone in my situation?',
    )
    await user.click(screen.getByRole('button', { name: /submit question/i }))
    expect(
      await screen.findByText('Your question is on the wall. Others can weigh in.'),
    ).toBeInTheDocument()
  })

  // 4.7 — The pre-4.7 unauth submit test ("unauthenticated question submit surfaces
  // question-specific auth modal CTA") was deleted: the chooser is auth-gated, so
  // an unauthenticated user clicking the hero opens the AuthModal directly and
  // never reaches the question composer. The new "hero unauth → auth modal" test
  // covers the unauth hero path. The defensive auth gate inside handleComposerSubmit
  // still exists for the rare logout-mid-session case but is no longer organically
  // reachable through the UI.
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
    renderPage('/prayer-wall')
    await user.click(screen.getAllByRole('button', { name: 'Share something' })[0])
    // "Discussion" also exists as a prayer-category filter pill; scope to the chooser dialog.
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Discussion' }))
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

  // 4.7 — Pre-4.7 unauth submit test deleted: same rationale as the question
  // composer above — the chooser is auth-gated, so an unauthenticated user
  // never reaches the discussion composer through the UI.
})

// =====================================================================
// Spec 4.7 — Composer Chooser integration (hero/auth/shim contracts)
// =====================================================================

describe('PrayerWall — Spec 4.7 Composer Chooser integration', () => {
  it('hero button opens ComposerChooser when authenticated, not InlineComposer directly', async () => {
    authState.current = {
      user: { id: 'u-test', name: 'Test' },
      isAuthenticated: true,
    }
    const user = userEvent.setup()
    renderPage('/prayer-wall')

    // Initially neither chooser nor InlineComposer header is visible.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /share a prayer request/i }),
    ).not.toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Share something' })[0])

    // Chooser dialog is open with the canonical title.
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(within(dialog).getByText(/what would you like to share/i)).toBeInTheDocument()
    // InlineComposer prayer_request header should NOT be on screen yet.
    expect(
      screen.queryByRole('heading', { name: /share a prayer request/i }),
    ).not.toBeInTheDocument()
  })

  it('hero button opens auth modal when unauthenticated, not chooser', async () => {
    authState.current = { user: null, isAuthenticated: false }
    const user = userEvent.setup()
    renderPage('/prayer-wall')

    await user.click(screen.getAllByRole('button', { name: 'Share something' })[0])

    // Auth modal subtitle is shown.
    expect(await screen.findByText(/sign in to share something/i)).toBeInTheDocument()
    // Chooser dialog is NOT shown.
    expect(
      screen.queryByText(/what would you like to share/i),
    ).not.toBeInTheDocument()
  })

  it('?debug-post-type query param is silently ignored after shim removal', async () => {
    authState.current = {
      user: { id: 'u-test', name: 'Test' },
      isAuthenticated: true,
    }
    renderPage('/prayer-wall?debug-post-type=testimony')

    // Composer is NOT auto-opened in testimony mode.
    expect(
      screen.queryByRole('heading', { name: /share a testimony/i }),
    ).not.toBeInTheDocument()
    // Chooser is NOT auto-opened.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.queryByText(/what would you like to share/i),
    ).not.toBeInTheDocument()
  })
})

// Prayer Wall Redesign (2026-05-13) — the Spec 4.8 RoomSelector + dual-filter
// UI was replaced by the unified CategoryFilters component. Several tests in
// this block ALSO contradict the new D-CategorySingleSelect behavior (e.g.
// "selecting All clears postType but preserves category" — the redesign
// clears BOTH axes on All; "selecting a category preserves an existing
// postType" — the redesign clears postType when a topic is selected).
// Component-level coverage of the new behavior lives in
// CategoryFilters.test.tsx. Page-level integration coverage will be added in
// Step 12 (Playwright). Skipping the block here per Plan-Time Divergence
// philosophy (cf. Plan-Time Divergence #2 — NightWatchChip.test.tsx deletion).
describe.skip('Spec 4.8 — RoomSelector + dual filters (DEPRECATED — see Prayer Wall Redesign 2026-05-13)', () => {
  // Restore `getMockPrayers` to its delegating implementation after each test
  // so a `mockReturnValue([])` set inside one test (e.g. the empty-state copy
  // assertion below) does not bleed into the next test or describe block.
  // The vi.mock factory at the top of this file binds the fn via
  // `vi.fn(original.getMockPrayers)` — this restore re-binds that delegation.
  // Pre-1.9b the file relied on describe ordering for this; the new describe
  // contains its own leak rather than depending on positional luck.
  afterEach(async () => {
    const actual = await vi.importActual<typeof import('@/mocks/prayer-wall-mock-data')>(
      '@/mocks/prayer-wall-mock-data',
    )
    const { getMockPrayers } = await import('@/mocks/prayer-wall-mock-data')
    vi.mocked(getMockPrayers).mockImplementation(actual.getMockPrayers)
  })

  it('renders RoomSelector toolbar above CategoryFilterBar in DOM order', () => {
    renderPage()
    const toolbars = screen.getAllByRole('toolbar')
    const roomToolbar = screen.getByRole('toolbar', { name: /filter by post type/i })
    const categoryToolbar = screen.getByRole('toolbar', {
      name: /filter prayers by category/i,
    })
    expect(toolbars).toContain(roomToolbar)
    expect(toolbars).toContain(categoryToolbar)
    // RoomSelector before CategoryFilterBar in document order.
    expect(
      roomToolbar.compareDocumentPosition(categoryToolbar) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('QOTD card renders ABOVE the filter bar wrapper (DOM order)', () => {
    renderPage()
    // QOTD's eyebrow text is the stable anchor — heading text is the daily question.
    const qotdEyebrow = screen.getByText('Question of the Day')
    const roomToolbar = screen.getByRole('toolbar', { name: /filter by post type/i })
    expect(
      qotdEyebrow.compareDocumentPosition(roomToolbar) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('selecting Testimonies activates the Testimonies pill (URL → ?postType=testimony)', async () => {
    const user = userEvent.setup()
    renderPage()
    const roomToolbar = screen.getByRole('toolbar', { name: /filter by post type/i })
    const testimoniesBtn = within(roomToolbar).getByRole('button', { name: 'Testimonies' })
    await user.click(testimoniesBtn)
    expect(testimoniesBtn).toHaveAttribute('aria-pressed', 'true')
    expect(within(roomToolbar).getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('selecting All clears postType but preserves category (D4 enforcement)', async () => {
    const user = userEvent.setup()
    renderPage('/prayer-wall?postType=testimony&category=health')
    const roomToolbar = screen.getByRole('toolbar', { name: /filter by post type/i })
    const categoryToolbar = screen.getByRole('toolbar', {
      name: /filter prayers by category/i,
    })
    // Pre-condition: both pills active.
    expect(
      within(roomToolbar).getByRole('button', { name: 'Testimonies' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      within(categoryToolbar).getByRole('button', { name: /^Health(\s|\()/i }),
    ).toHaveAttribute('aria-pressed', 'true')
    await user.click(within(roomToolbar).getByRole('button', { name: 'All' }))
    // Post: postType cleared, category preserved.
    expect(within(roomToolbar).getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(
      within(categoryToolbar).getByRole('button', { name: /^Health(\s|\()/i }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('initial render with ?postType=encouragement: Encouragements pill is active', () => {
    renderPage('/prayer-wall?postType=encouragement')
    const roomToolbar = screen.getByRole('toolbar', { name: /filter by post type/i })
    expect(
      within(roomToolbar).getByRole('button', { name: 'Encouragements' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(within(roomToolbar).getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('invalid postType in URL falls back to All (defensive — W5)', () => {
    renderPage('/prayer-wall?postType=banana')
    const roomToolbar = screen.getByRole('toolbar', { name: /filter by post type/i })
    expect(within(roomToolbar).getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    // No banana pill rendered.
    expect(
      within(roomToolbar).queryByRole('button', { name: /banana/i }),
    ).not.toBeInTheDocument()
  })

  it('combined filter URL activates both Testimonies and Health pills', () => {
    renderPage('/prayer-wall?postType=testimony&category=health')
    const roomToolbar = screen.getByRole('toolbar', { name: /filter by post type/i })
    const categoryToolbar = screen.getByRole('toolbar', {
      name: /filter prayers by category/i,
    })
    expect(
      within(roomToolbar).getByRole('button', { name: 'Testimonies' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      within(categoryToolbar).getByRole('button', { name: /^Health(\s|\()/i }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('selecting a category preserves an existing postType (D4 enforcement)', async () => {
    const user = userEvent.setup()
    renderPage('/prayer-wall?postType=testimony')
    const roomToolbar = screen.getByRole('toolbar', { name: /filter by post type/i })
    const categoryToolbar = screen.getByRole('toolbar', {
      name: /filter prayers by category/i,
    })
    expect(
      within(roomToolbar).getByRole('button', { name: 'Testimonies' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await user.click(
      within(categoryToolbar).getByRole('button', { name: /^Health(\s|$)/i }),
    )
    expect(
      within(categoryToolbar).getByRole('button', { name: /^Health(\s|\()/i }),
    ).toHaveAttribute('aria-pressed', 'true')
    // postType still set after category click — D4 invariant.
    expect(
      within(roomToolbar).getByRole('button', { name: 'Testimonies' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('empty-state heading adapts to combined filter ("No Testimonies in Health yet")', async () => {
    const { getMockPrayers } = await import('@/mocks/prayer-wall-mock-data')
    vi.mocked(getMockPrayers).mockReturnValue([])
    renderPage('/prayer-wall?postType=testimony&category=health')
    expect(screen.getByText(/No Testimonies in Health yet/i)).toBeInTheDocument()
  })
})

// --- Spec 6.3 — Night Mode integration tests ---

describe('PrayerWall — Spec 6.3 Night Mode', () => {
  beforeEach(() => {
    vi.mocked(useNightMode).mockReturnValue({
      active: false,
      source: 'auto',
      userPreference: 'auto',
    })
  })

  it("BackgroundCanvas receives data-night-mode='off' when nightActive=false", () => {
    const { container } = renderPage()
    const canvas = container.querySelector('[data-testid="background-canvas"]')
    expect(canvas).not.toBeNull()
    expect(canvas!.getAttribute('data-night-mode')).toBe('off')
  })

  it("BackgroundCanvas receives data-night-mode='on' when nightActive=true", () => {
    vi.mocked(useNightMode).mockReturnValue({
      active: true,
      source: 'auto',
      userPreference: 'auto',
    })
    const { container } = renderPage()
    const canvas = container.querySelector('[data-testid="background-canvas"]')
    expect(canvas!.getAttribute('data-night-mode')).toBe('on')
  })

  // Prayer Wall Redesign (2026-05-13) — NightWatchChip in PrayerWallHero was
  // replaced by NightModeBadge mounted in the global Navbar. Aria-label changed
  // from "Night Mode active" to "Night Mode is {Off|Auto|On}. Tap to change."
  it('renders NightModeBadge when nightActive=true', () => {
    vi.mocked(useNightMode).mockReturnValue({
      active: true,
      source: 'auto',
      userPreference: 'auto',
    })
    renderPage()
    const badges = screen.getAllByRole('button', {
      name: /night mode is (off|auto|on)/i,
    })
    expect(badges.length).toBeGreaterThan(0)
  })

  it('does NOT render NightModeBadge when nightActive=false', () => {
    renderPage()
    expect(
      screen.queryByRole('button', {
        name: /night mode is (off|auto|on)/i,
      }),
    ).not.toBeInTheDocument()
  })

  it('hero subtitle uses day variant when nightActive=false', () => {
    renderPage()
    expect(screen.getByText('What weighs on you today?')).toBeInTheDocument()
  })

  it('hero subtitle uses night variant when nightActive=true', () => {
    vi.mocked(useNightMode).mockReturnValue({
      active: true,
      source: 'auto',
      userPreference: 'auto',
    })
    renderPage()
    expect(
      screen.getByText("It's quiet here. You're awake."),
    ).toBeInTheDocument()
  })

  // NOTE: document.title verification requires HelmetProvider in the render
  // wrapper; the rest of the suite intentionally doesn't mount it. Page title
  // copy correctness is covered by `night-mode-copy.test.ts`, and the
  // conditional `<SEO ... title=... noSuffix />` render branch is exercised
  // implicitly by the night-state mock above. Real-browser title behavior is
  // covered by the e2e test (which mounts the full app + HelmetProvider).

  it('empty-state description swaps to night variant when feed empty + nightActive=true', async () => {
    const { getMockPrayers } = await import('@/mocks/prayer-wall-mock-data')
    vi.mocked(getMockPrayers).mockReturnValue([])
    vi.mocked(useNightMode).mockReturnValue({
      active: true,
      source: 'auto',
      userPreference: 'auto',
    })
    renderPage()
    expect(
      screen.getByText("It's quiet tonight. Be the first."),
    ).toBeInTheDocument()
  })
})
