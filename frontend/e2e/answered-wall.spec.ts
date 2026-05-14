/**
 * Spec 6.6 — Answered Wall E2E smoke.
 *
 * Adds end-to-end browser-level coverage of:
 *
 *   1. Cross-navigation between /prayer-wall and /prayer-wall/answered via
 *      the PrayerWallViewTabs pill strip
 *   2. The praising-reaction toggle ceremony — aria-pressed state flip,
 *      sparkle icon, optimistic update
 *   3. axe-core accessibility scan in both populated and empty states
 *      (Gate-G-A11Y from spec §6 — zero violations in both states)
 *
 * **Note on execution:** this file is checked in as test infrastructure but
 * was NOT executed during /execute-plan-forums per Eric's instruction
 * ("Do not start verify-with-playwright — stop and report"). Run later via:
 *
 *     pnpm test:e2e answered-wall
 *
 * Uses `page.route()` interception to mock the
 * `GET /api/v1/posts?sort=answered` feed and the reaction-toggle endpoint,
 * keeping the spec self-contained against the running frontend dev server.
 */
import { test, expect, type Page } from '@playwright/test'
import { runAxeScan } from './fixtures'

const POST_ID = 'answered-prayer-fixture-1'
const POST_ID_2 = 'answered-prayer-fixture-2'
const AUTHOR_ID = '00000000-0000-0000-0000-00000000bbbb'
const VIEWER_ID = '00000000-0000-0000-0000-00000000dddd'

const ANSWERED_FIXTURE = (overrides: Record<string, unknown> = {}) => ({
  id: POST_ID,
  userId: AUTHOR_ID,
  postType: 'prayer_request',
  content: 'Please pray for healing for my mother.',
  category: 'health',
  isAnonymous: false,
  visibility: 'public',
  isAnswered: true,
  answeredText: "She's home from the hospital and recovering well. Thank you for praying.",
  answeredAt: '2026-05-11T14:00:00Z',
  moderationStatus: 'approved',
  crisisFlag: false,
  prayingCount: 12,
  candleCount: 0,
  praisingCount: 0,
  commentCount: 3,
  bookmarkCount: 1,
  createdAt: '2026-05-08T09:00:00Z',
  updatedAt: '2026-05-11T14:00:00Z',
  lastActivityAt: '2026-05-11T14:00:00Z',
  author: {
    userId: AUTHOR_ID,
    displayName: 'Avery',
    avatarUrl: null,
  },
  helpTags: [],
  ...overrides,
})

const POPULATED_FEED = {
  data: [
    ANSWERED_FIXTURE(),
    ANSWERED_FIXTURE({
      id: POST_ID_2,
      content: 'Praying for direction on a job decision.',
      answeredText: 'I got the offer and accepted. Praising God for the clarity.',
      answeredAt: '2026-05-09T10:00:00Z',
      prayingCount: 5,
    }),
  ],
  meta: {
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
    requestId: 'rid-test-feed',
  },
}

const EMPTY_FEED = {
  data: [],
  meta: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
    requestId: 'rid-test-empty-feed',
  },
}

async function seedViewerSession(page: Page) {
  await page.goto('/')
  await page.evaluate(
    ({ viewerId }) => {
      localStorage.setItem('wr_auth_simulated', 'true')
      localStorage.setItem('wr_user_id', viewerId)
      localStorage.setItem('wr_user_name', 'Test Viewer')
    },
    { viewerId: VIEWER_ID },
  )
}

async function mockEndpoints(page: Page, feed: typeof POPULATED_FEED | typeof EMPTY_FEED) {
  await page.route(`**/api/v1/legal/versions`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { terms: '1.0', privacy: '1.0' }, meta: { requestId: 'rid' } }),
    })
  })

  await page.route(
    /\/api\/v1\/posts\?.*sort=answered.*/,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(feed),
      })
    },
  )

  // Reaction toggle — flips state on every call. Tracks a per-test counter
  // so consecutive POSTs alternate between 'added' and 'removed'.
  let praisingState = false
  await page.route(
    /\/api\/v1\/posts\/.*\/reactions/,
    async (route) => {
      const method = route.request().method()
      if (method === 'POST') {
        praisingState = !praisingState
        await route.fulfill({
          status: praisingState ? 201 : 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              reactionType: 'praising',
              state: praisingState ? 'added' : 'removed',
              prayingCount: 12,
              candleCount: 0,
              praisingCount: praisingState ? 1 : 0,
            },
            meta: { requestId: 'rid-test-toggle' },
          }),
        })
      } else {
        await route.fulfill({ status: 204 })
      }
    },
  )
}

test.describe('Answered Wall — populated state', () => {
  test.beforeEach(async ({ page }) => {
    await seedViewerSession(page)
    await mockEndpoints(page, POPULATED_FEED)
  })

  test('navigates from /prayer-wall to /prayer-wall/answered via the tab strip', async ({ page }) => {
    await page.goto('/prayer-wall')

    // Tab strip visible on both pages.
    const tabs = page.getByRole('navigation', { name: 'Prayer Wall views' })
    await expect(tabs).toBeVisible()

    await tabs.getByRole('link', { name: 'Answered' }).click()
    await expect(page).toHaveURL(/\/prayer-wall\/answered/)

    // aria-current="page" on the active tab.
    const answeredTab = tabs.getByRole('link', { name: 'Answered' })
    await expect(answeredTab).toHaveAttribute('aria-current', 'page')

    // Heading + subhead.
    await expect(page.getByRole('heading', { level: 1, name: 'Answered' })).toBeVisible()
    await expect(page.getByText('Prayers the community has watched God move in.')).toBeVisible()

    // Navigate back via the "All" tab.
    await tabs.getByRole('link', { name: 'All' }).click()
    await expect(page).toHaveURL(/\/prayer-wall$/)
  })

  test('renders the "How this was answered" region for each fixture post', async ({ page }) => {
    await page.goto('/prayer-wall/answered')

    // Two seeded posts, two answer-text regions.
    const regions = page.getByRole('region', { name: 'How this was answered' })
    await expect(regions).toHaveCount(2)
    await expect(regions.first()).toContainText("She's home from the hospital")
    await expect(regions.nth(1)).toContainText('I got the offer and accepted')
  })

  test('praising button toggles aria-pressed state on click', async ({ page }) => {
    await page.goto('/prayer-wall/answered')

    const praisingButton = page
      .getByRole('button', { name: /Praising with you/i })
      .first()
    await expect(praisingButton).toHaveAttribute('aria-pressed', 'false')

    await praisingButton.click()
    await expect(praisingButton).toHaveAttribute('aria-pressed', 'true')

    await praisingButton.click()
    await expect(praisingButton).toHaveAttribute('aria-pressed', 'false')
  })

  test('axe-core scan passes with zero violations (populated)', async ({ page }) => {
    await page.goto('/prayer-wall/answered')
    await expect(page.getByRole('heading', { level: 1, name: 'Answered' })).toBeVisible()
    const violations = await runAxeScan(page)
    expect(violations).toEqual([])
  })
})

test.describe('Answered Wall — empty state', () => {
  test.beforeEach(async ({ page }) => {
    await seedViewerSession(page)
    await mockEndpoints(page, EMPTY_FEED)
  })

  test('renders the empty state copy and zero axe violations', async ({ page }) => {
    await page.goto('/prayer-wall/answered')

    await expect(page.getByRole('heading', { level: 1, name: 'Answered' })).toBeVisible()
    await expect(
      page.getByText(/No answered prayers yet/i),
    ).toBeVisible()

    const violations = await runAxeScan(page)
    expect(violations).toEqual([])
  })
})
