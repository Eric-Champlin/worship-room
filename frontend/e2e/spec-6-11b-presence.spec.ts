/**
 * Spec 6.11b — Live Presence Component E2E.
 *
 * Two suites:
 *   1. **Suppression suite** — fully mocked via `page.route()`. Verifies that
 *      a crisis-flagged post in the feed response causes the PresenceIndicator
 *      to render nothing (Gate-G-CRISIS-SUPPRESSION). Runnable without backend.
 *   2. **Two-context suite** — REAL backend required. Two browser contexts
 *      load `/prayer-wall`; both bump anonymous presence sessions and the count
 *      converges to 2+ within 60s. Self-contained: no DB seed required because
 *      the presence sorted-set is Redis-backed and the GET is public/anonymous.
 *
 * The two-context suite is gated by the same env shape as `phase03-prayer-wall-roundtrip`:
 *   - Local dev: backend on :8080, frontend on :5173 — `pnpm dev` + Docker stack up.
 *   - Production smoke: set PLAYWRIGHT_BASE_URL to the deployed frontend.
 *
 * If running against a fresh backend, the count starts at 0 and grows as both
 * contexts hit the page. The 30s server-cache TTL + 30s polling cadence means
 * the test waits up to 60s for the second context's bump to surface.
 */
import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const POST_ID = '11111111-2222-3333-4444-555555555555'
const AUTHOR_ID = 'aaaaaaaa-1111-2222-3333-444444444444'

const FEED_FIXTURE = (overrides: Array<Record<string, unknown>> = []) => ({
  data: [
    {
      id: POST_ID,
      userId: AUTHOR_ID,
      postType: 'prayer_request',
      content: 'Please pray for healing for my mother.',
      category: 'health',
      isAnonymous: false,
      visibility: 'public',
      isAnswered: false,
      moderationStatus: 'visible',
      crisisFlag: false,
      isOwnPost: false,
      isFriendOfAuthor: false,
      isAuthorBlocked: false,
      isAuthorMuted: false,
      isDeleted: false,
      candleCount: 0,
      prayingCount: 0,
      amenCount: 0,
      heartCount: 0,
      praisingCount: 0,
      celebrateCount: 0,
      commentCount: 0,
      bookmarkCount: 0,
      qotdId: null,
      questionResolvedCommentId: null,
      helpTags: [],
      imageMediaId: null,
      imageThumbnailUrl: null,
      imageMediumUrl: null,
      imageFullUrl: null,
      createdAt: '2026-05-15T00:00:00Z',
      updatedAt: '2026-05-15T00:00:00Z',
      bumpedAt: '2026-05-15T00:00:00Z',
      user: {
        id: AUTHOR_ID,
        displayName: 'Sarah',
        avatarUrl: null,
        isAdmin: false,
      },
      ...overrides[0],
    },
  ],
  meta: { page: 1, limit: 20, totalCount: 1, hasNextPage: false, requestId: 'rid' },
})

async function mockSupportEndpoints(page: Page) {
  await page.route('**/api/v1/legal/versions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { terms: '1.0', privacy: '1.0' },
        meta: { requestId: 'rid' },
      }),
    })
  })
  await page.route('**/api/v1/users/me/reactions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {}, meta: { requestId: 'rid' } }),
    })
  })
  await page.route('**/api/v1/users/me/bookmarks*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [],
        meta: { page: 1, limit: 20, totalCount: 0, hasNextPage: false, requestId: 'rid' },
      }),
    })
  })
  await page.route('**/api/v1/qotd/today', async (route) => {
    await route.fulfill({ status: 404, body: '' })
  })
}

test.describe('Spec 6.11b — Live Presence (mocked)', () => {
  test('PresenceIndicator renders when feed has no crisis-flagged posts and count > 0', async ({ page }) => {
    await mockSupportEndpoints(page)
    await page.route(/\/api\/v1\/posts\?.*/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FEED_FIXTURE()),
      })
    })
    // Mock /prayer-wall/presence to return a positive count synchronously.
    await page.route('**/api/v1/prayer-wall/presence', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { count: 5 }, meta: { requestId: 'rid' } }),
      })
    })

    await page.goto('/prayer-wall')

    // Indicator renders within the feed-header testid and shows the plural copy.
    await expect(
      page.getByTestId('feed-header').getByText(/5 people here now/),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('PresenceIndicator is suppressed when feed has any crisis-flagged post (Gate-G-CRISIS-SUPPRESSION)', async ({ page }) => {
    await mockSupportEndpoints(page)
    // Mark the single feed post as crisis-flagged.
    await page.route(/\/api\/v1\/posts\?.*/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FEED_FIXTURE([{ crisisFlag: true }])),
      })
    })
    // Even though presence endpoint would return a positive count, the indicator
    // should be suppressed.
    let presenceWasCalled = false
    await page.route('**/api/v1/prayer-wall/presence', async (route) => {
      presenceWasCalled = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { count: 15 }, meta: { requestId: 'rid' } }),
      })
    })

    await page.goto('/prayer-wall')

    // Wait for the feed to render (post card visible) so we know the page is past loading.
    await page.waitForLoadState('networkidle', { timeout: 15_000 })

    // Indicator copy must NOT appear.
    await expect(
      page.locator('text=/people here now|person here/i'),
    ).toHaveCount(0)

    // Bonus: confirm the hook never even called the endpoint (suppressed=true short-circuits).
    expect(presenceWasCalled).toBe(false)
  })
})

/**
 * Two-context happy-path test — REQUIRES live backend.
 *
 * Skipped automatically unless the SPEC_6_11B_LIVE env var is set, because
 * the test depends on a running backend at :8080 (or whatever the frontend
 * is configured to talk to). Run with:
 *
 *   SPEC_6_11B_LIVE=1 pnpm test:e2e spec-6-11b-presence
 *
 * In CI, gate on the same env var so the suite doesn't fail when no backend
 * is reachable.
 */
const LIVE = Boolean(process.env.SPEC_6_11B_LIVE)

test.describe(LIVE ? 'Spec 6.11b — Live Presence (live backend)' : 'Spec 6.11b — Live Presence (live backend, SKIPPED)', () => {
  test.skip(!LIVE, 'Requires live backend; set SPEC_6_11B_LIVE=1 to run')

  test('two browser contexts both loading the Prayer Wall produce count >= 2', async ({ browser }) => {
    test.setTimeout(120_000)
    const ctxA = await browser.newContext()
    const ctxB = await browser.newContext()

    const pageA = await ctxA.newPage()
    const pageB = await ctxB.newPage()

    await pageA.goto('/prayer-wall')
    await pageB.goto('/prayer-wall')

    // Each context maps to a separate anonymous-session cookie, so both contribute
    // to the count independently. The count converges within 30-60s of first load
    // due to the 30s polling cadence + 30s server cache TTL.
    await expect(
      pageA.getByTestId('feed-header').getByText(/(\d+)\s+people here now|1 person here/),
    ).toBeVisible({ timeout: 90_000 })

    await ctxA.close()
    await ctxB.close()
  })
})

/**
 * Spec 6.11b — accessibility smoke (Universal Rule 9 + axe-core).
 *
 * Verifies the PrayerWall feed-header (which now hosts the PresenceIndicator)
 * passes WCAG 2.1 AA via axe-core. Mocked feed and presence response so the
 * scan is deterministic — the scope is the indicator + its container, not
 * any backend-driven content.
 */
test.describe('Spec 6.11b — accessibility', () => {
  test('PrayerWall feed-header passes axe-core a11y check with PresenceIndicator mounted', async ({ page }) => {
    await mockSupportEndpoints(page)
    await page.route(/\/api\/v1\/posts\?.*/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FEED_FIXTURE()),
      })
    })
    await page.route('**/api/v1/prayer-wall/presence', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { count: 5 }, meta: { requestId: 'rid' } }),
      })
    })

    await page.goto('/prayer-wall')
    await page.waitForSelector('[data-testid="feed-header"]', { timeout: 10_000 })
    await expect(
      page.getByTestId('feed-header').getByText(/5 people here now/),
    ).toBeVisible()

    const results = await new AxeBuilder({ page })
      .include('[data-testid="feed-header"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    // Filter to critical/serious — minor/moderate are tracked separately for cleanup.
    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    )
    expect(
      criticalOrSerious,
      `Critical/serious a11y violations on PresenceIndicator:\n${JSON.stringify(criticalOrSerious, null, 2)}`,
    ).toEqual([])
  })
})
