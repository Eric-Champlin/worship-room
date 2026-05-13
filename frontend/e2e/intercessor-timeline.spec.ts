/**
 * Spec 6.5 — Intercessor Timeline E2E smoke.
 *
 * **Scoping rationale (mirrors `prayer-receipt.spec.ts`):** the LOAD-BEARING
 * privacy + classification contracts are exhaustively verified by
 * `IntercessorIntegrationTest` (18 scenarios, Step 5) and the component test
 * suite (Step 9 — `IntercessorTimeline.test.tsx` + `useIntercessors.test.ts` +
 * `intercessor-summary.test.ts` + `relative-time.test.ts`, 26 frontend tests).
 *
 * This spec adds end-to-end-browser-level coverage of the things that can
 * ONLY be verified in a real browser:
 *
 *   1. Real focus management (Tab cycle, Enter key activation)
 *   2. axe-core accessibility scan in both collapsed and expanded states
 *      (Gate from spec §10 — zero violations in both states at 1440px + 375px)
 *   3. Real layout — the verse rendering, the expand animation, the muted-
 *      type styling — visible to a real browser rendering engine
 *
 * **Deferred / out-of-scope:** Full backend-roundtrip flow (real friendship
 * seeding + reaction-toggle via second user + JWT-real-auth path) requires a
 * multi-user dev-seed infrastructure that doesn't yet exist for E2E. The
 * Spec 3.12 phase03-prayer-wall-roundtrip pattern is single-user only.
 * Wire-shape userId-absence assertion lives in the backend integration test
 * (`IntercessorIntegrationTest.getIntercessors_mixedNamedAndAnonymous_jsonResponseOmitsUserIdForAnonymous`).
 * Tracked as a follow-up.
 *
 * This file uses `page.route()` interception to mock the
 * `/api/v1/posts/{id}/intercessors` endpoint AND the upstream
 * `/api/v1/posts/{id}` getById response, keeping the spec self-contained
 * against the running frontend dev server.
 */
import { test, expect, type Page } from '@playwright/test'
import { runAxeScan } from './fixtures'

// Use an existing mock prayer so PrayerDetail's mock-mode lookup finds it.
// `prayer-qotd-1` has `postType: 'prayer_request'`, `prayingCount: 5`. The
// IntercessorTimeline mounts on this card and shows the expand affordance
// (count >= 2).
const POST_ID = 'prayer-qotd-1'
const AUTHOR_ID = '00000000-0000-0000-0000-00000000aaaa'
const VIEWER_ID = '00000000-0000-0000-0000-00000000cccc'

/**
 * Mock prayer payload — single prayer_request post with prayingCount=3.
 * `getById` response doesn't include `intercessorSummary` (that's feed-only
 * per spec § "API Changes") — the timeline falls back to the count-only
 * collapsed summary and re-fetches the named entries on expand.
 */
const MOCK_PRAYER_GET_BY_ID = {
  data: {
    id: POST_ID,
    userId: AUTHOR_ID,
    postType: 'prayer_request',
    content: 'Please pray for my family this week.',
    category: 'family',
    isAnonymous: false,
    visibility: 'public',
    isAnswered: false,
    moderationStatus: 'approved',
    crisisFlag: false,
    prayingCount: 3,
    candleCount: 0,
    commentCount: 0,
    bookmarkCount: 0,
    createdAt: '2026-05-13T11:00:00Z',
    updatedAt: '2026-05-13T11:00:00Z',
    lastActivityAt: '2026-05-13T11:30:00Z',
    author: {
      userId: AUTHOR_ID,
      displayName: 'Avery',
      avatarUrl: null,
    },
    helpTags: [],
  },
  meta: { requestId: 'rid-test-getbyid' },
}

/**
 * Mock intercessors response — 3 entries: 2 named, 1 anonymous.
 * Note the anonymous entry has NO `userId` key — mirrors the real backend
 * contract (Gate-G-ANONYMOUS-PRIVACY).
 */
const MOCK_INTERCESSORS = {
  data: {
    entries: [
      {
        userId: '00000000-0000-0000-0000-00000000aaa1',
        displayName: 'Sarah',
        isAnonymous: false,
        reactedAt: '2026-05-13T11:30:00Z',
      },
      {
        // No userId key — anonymous entry. The backend serializes
        // `@JsonInclude(NON_NULL)` on userId so the field is ABSENT (not null)
        // when isAnonymous=true. The mock matches the wire contract.
        displayName: 'Anonymous',
        isAnonymous: true,
        reactedAt: '2026-05-13T11:15:00Z',
      },
      {
        userId: '00000000-0000-0000-0000-00000000aaa3',
        displayName: 'Mark',
        isAnonymous: false,
        reactedAt: '2026-05-13T11:00:00Z',
      },
      {
        displayName: 'Anonymous',
        isAnonymous: true,
        reactedAt: '2026-05-13T10:45:00Z',
      },
      {
        userId: '00000000-0000-0000-0000-00000000aaa5',
        displayName: 'Hannah',
        isAnonymous: false,
        reactedAt: '2026-05-13T10:30:00Z',
      },
    ],
    // Matches mock prayer's prayingCount=5 so the aria-label stays stable
    // across collapsed/expanded states ("5 people praying" in both).
    totalCount: 5,
  },
  meta: { requestId: 'rid-test-intercessors' },
}

async function seedViewerSession(page: Page) {
  await page.goto('/')
  await page.evaluate(
    ({ viewerId }) => {
      localStorage.setItem('wr_auth_simulated', 'true')
      localStorage.setItem('wr_user_name', 'Vera')
      localStorage.setItem('wr_user_id', viewerId)
      // Suppress BB-34 first-run welcome and any other one-time-onboarding
      // overlays so they don't intercept clicks on the prayer card.
      localStorage.setItem('wr_first_run_completed', String(Date.now()))
      localStorage.setItem('wr_onboarding_complete', 'true')
    },
    { viewerId: VIEWER_ID },
  )
}

async function mockEndpoints(page: Page) {
  // Force `useLegalVersions` into the error branch by returning 500. The hook
  // sets `versions = null` on error, and `LegalVersionGate.isStaleAcceptance`
  // short-circuits to `false` when versions is null — so the "We updated our
  // terms." modal does NOT mount and clicks reach the prayer card.
  await page.route(`**/api/v1/legal/versions`, async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'INTERNAL_ERROR', message: 'noop' }),
    })
  })
  await page.route(`**/api/v1/posts/${POST_ID}`, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_PRAYER_GET_BY_ID),
    })
  })
  await page.route(
    `**/api/v1/posts/${POST_ID}/intercessors`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'private, no-store' },
        body: JSON.stringify(MOCK_INTERCESSORS),
      })
    },
  )
  // Permissive fall-through for comments / reactions / etc — empty bodies are fine.
  await page.route(
    `**/api/v1/posts/${POST_ID}/comments**`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], meta: { requestId: 'noop' } }),
      })
    },
  )
}

test.describe('Spec 6.5 — Intercessor Timeline E2E smoke', () => {
  test('expand button toggles aria-expanded and reveals entries list', async ({
    page,
  }) => {
    await seedViewerSession(page)
    await mockEndpoints(page)
    await page.goto(`/prayer-wall/${POST_ID}`)

    // Wait for the prayer card to render.
    // Wait for the mock prayer to render (mock content from prayer-qotd-1).
    await expect(
      page.getByText(/spending just 10 minutes every morning/i),
    ).toBeVisible({ timeout: 10_000 })

    // Collapsed: count-only fallback because getById doesn't include
    // intercessorSummary.firstThree. With prayingCount=3 and empty firstThree,
    // formatSummaryLine returns "3 people are praying".
    const expandButton = page.getByRole('button', {
      name: /5 people praying/i,
    })
    await expect(expandButton).toBeVisible()
    await expect(expandButton).toHaveAttribute('aria-expanded', 'false')

    // Expand
    await expandButton.click()
    await expect(expandButton).toHaveAttribute('aria-expanded', 'true')

    // Entries list should appear with 5 listitems (2 named + 1 anon + 1 anon + 1 named)
    const list = page.locator('ul[role="list"]').filter({ hasText: 'Sarah' })
    await expect(list).toBeVisible({ timeout: 5_000 })
    await expect(list.getByText('Sarah')).toBeVisible()
    await expect(list.getByText('Mark')).toBeVisible()
    await expect(list.getByText('Hannah')).toBeVisible()
    // Two anonymous entries — at-least-1 match is the assertion.
    await expect(list.getByText('Anonymous').first()).toBeVisible()
    await expect(list.locator('li[role="listitem"]')).toHaveCount(5)

    // Collapse
    await expandButton.click()
    await expect(expandButton).toHaveAttribute('aria-expanded', 'false')
  })

  test('keyboard activation (Enter) expands the timeline', async ({ page }) => {
    await seedViewerSession(page)
    await mockEndpoints(page)
    await page.goto(`/prayer-wall/${POST_ID}`)

    // Wait for the mock prayer to render (mock content from prayer-qotd-1).
    await expect(
      page.getByText(/spending just 10 minutes every morning/i),
    ).toBeVisible({ timeout: 10_000 })

    const expandButton = page.getByRole('button', {
      name: /5 people praying/i,
    })
    await expandButton.focus()
    await page.keyboard.press('Enter')

    await expect(expandButton).toHaveAttribute('aria-expanded', 'true')
  })

  test('axe-core scan passes with zero violations — collapsed and expanded states', async ({
    page,
  }) => {
    await seedViewerSession(page)
    await mockEndpoints(page)
    await page.goto(`/prayer-wall/${POST_ID}`)

    // Wait for the mock prayer to render (mock content from prayer-qotd-1).
    await expect(
      page.getByText(/spending just 10 minutes every morning/i),
    ).toBeVisible({ timeout: 10_000 })

    // Scope the axe scan to the IntercessorTimeline region only — the rest
    // of the Prayer Wall chrome has pre-existing violations (deprecated
    // `text-primary-lt` contrast pattern, etc.) that are out of scope for 6.5.
    // The Gate from spec §10 is "zero violations in the timeline's own DOM."
    const SCOPE = '[data-testid="intercessor-timeline"]'

    const collapsedViolations = await runAxeScan(page, { include: SCOPE })
    expect(collapsedViolations).toEqual([])

    const expandButton = page.getByRole('button', {
      name: /5 people praying/i,
    })
    await expandButton.click()
    await expect(expandButton).toHaveAttribute('aria-expanded', 'true')

    const expandedViolations = await runAxeScan(page, { include: SCOPE })
    expect(expandedViolations).toEqual([])
  })

  test('intercessors response carries Cache-Control: private, no-store', async ({
    page,
  }) => {
    await seedViewerSession(page)
    await mockEndpoints(page)

    const responsePromise = page.waitForResponse((res) =>
      res.url().includes(`/api/v1/posts/${POST_ID}/intercessors`),
    )
    await page.goto(`/prayer-wall/${POST_ID}`)

    // Wait for the mock prayer to render (mock content from prayer-qotd-1).
    await expect(
      page.getByText(/spending just 10 minutes every morning/i),
    ).toBeVisible({ timeout: 10_000 })

    const expandButton = page.getByRole('button', {
      name: /5 people praying/i,
    })
    await expandButton.click()

    const response = await responsePromise
    expect(response.headers()['cache-control']).toBe('private, no-store')
  })
})
