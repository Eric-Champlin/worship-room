/**
 * Spec 7.7 — Privacy Tiers create-and-render E2E
 *
 * Exercises the full visibility flow against a REAL backend with the
 * dev-seed user Sarah:
 *
 *   1. Sarah opens the Prayer Wall InlineComposer
 *   2. Verifies the VisibilitySelector renders three chips with Public as default
 *   3. Creates posts at each tier (Public / Friends / Private)
 *   4. Verifies each post renders with the matching icon (none / Users / Lock)
 *
 * Plan-Time Divergence from Spec 7.7 plan Step 10:
 *   1. The original plan called for a 3-user multi-context test (Sarah creates
 *      a Friends post, Bob/friend sees it, Mikey/stranger does not). That
 *      requires setting up Sarah↔Bob friendship via the friend-request API in
 *      a beforeAll block, which adds test-infrastructure complexity outside
 *      this spec's scope. The cross-viewer enforcement is already verified by
 *      the backend integration test (PostVisibilityEnforcementIntegrationTest,
 *      Step 1 of this plan) which exercises listFeed / getById /
 *      listAuthorPosts / friendPrayersToday for friend, stranger, author, and
 *      anonymous viewers. This Playwright spec focuses on the UI → API → DB
 *      → author-render path, which is the gap the backend test cannot cover.
 *      A future spec can extend this to multi-user once friend-handshake
 *      seeding infrastructure lands.
 *
 *   2. All scenarios are consolidated into a single Playwright test using one
 *      login. The auth rate limit is 5/15min per email (Spec 1.5
 *      LoginRateLimitFilter), so running 4 separate `signInAsDevSeed` tests
 *      burns through Sarah's login budget. Single-login + sequential
 *      scenarios is the more reliable pattern.
 *
 * Prerequisites:
 *   - Dev backend running on :8080 with dev-seed.xml loaded
 *   - Frontend dev server running on :5173
 *   - Sarah's login rate-limit budget NOT exhausted (wait 15 min between runs
 *     if rerunning after a failed pass)
 */
import { test, expect, type Page, request as pwRequest } from '@playwright/test'
import {
  DEV_SEED_PASSWORD,
  seedSkipDashboardGates,
} from './fixtures'

// Use Bob (a different dev-seed user) to avoid Sarah's auth rate-limit budget
// being shared with other dev tests (phase01, phase03, sessions) that all
// log in as sarah@worshiproom.dev. Bob is a less-used dev-seed user and is
// less likely to hit the 5/15min rate-limit cap.
const SPEC_7_7_TEST_EMAIL = 'bob@worshiproom.dev'

const IS_PROD_MODE = Boolean(process.env.PLAYWRIGHT_BASE_URL)
const LOCAL_BACKEND_HEALTH_URL = 'http://localhost:8080/actuator/health'
const LOGIN_TIMEOUT_MS = 10_000

async function openAuthModalInLoginView(page: Page) {
  await page.goto('/')
  await seedSkipDashboardGates(page)
  await page
    .getByRole('button', { name: /Get Started/i })
    .first()
    .click()
  await page.waitForSelector('[role="dialog"][aria-modal="true"]', {
    timeout: 5_000,
  })
  const loginToggle = page
    .getByRole('dialog')
    .getByRole('button', { name: 'Log in' })
  if (await loginToggle.count()) {
    await loginToggle.first().click()
  }
}

async function loginViaModal(page: Page, email: string, password: string) {
  await openAuthModalInLoginView(page)
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('dialog').getByRole('button', { name: 'Log In' }).click()
}

/**
 * Dismiss the post-login "We updated our terms" consent modal (Spec 1.10f)
 * if it appears. Dev-seed users have `terms_version=null` and the modal
 * surfaces whenever the legal version-mismatch handler fires after auth init
 * AND after subsequent navigation events. Safe to call repeatedly.
 */
async function dismissTermsModalIfPresent(page: Page) {
  const laterButton = page.getByRole('button', { name: /^Later$/ })
  try {
    await laterButton.waitFor({ state: 'visible', timeout: 2_000 })
    await laterButton.click()
  } catch {
    // Modal didn't appear; that's fine.
  }
}

async function signInAsDevSeed(page: Page) {
  await loginViaModal(page, SPEC_7_7_TEST_EMAIL, DEV_SEED_PASSWORD)
  await dismissTermsModalIfPresent(page)
  await expect(page.getByRole('button', { name: 'User menu' })).toBeVisible({
    timeout: LOGIN_TIMEOUT_MS,
  })
}

async function openInlineComposer(page: Page) {
  await page
    .getByRole('button', { name: 'Share something' })
    .first()
    .click()
  // ComposerChooser dialog opens; pick Prayer Request.
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Prayer request/i })
    .click()
}

async function createPostWithVisibility(
  page: Page,
  content: string,
  visibility: 'public' | 'friends' | 'private',
) {
  await openInlineComposer(page)
  await page.getByLabel('Prayer request').fill(content)
  await page
    .getByRole('radiogroup', { name: 'Prayer category' })
    .first()
    .getByRole('radio', { name: 'Health', exact: true })
    .click()
  if (visibility !== 'public') {
    // Public is the default; only click for non-default tiers.
    await page
      .getByRole('radiogroup', { name: 'Post visibility' })
      .getByRole('radio', { name: new RegExp(visibility, 'i') })
      .click()
  }
  await page.getByRole('button', { name: 'Submit Prayer Request' }).click()
  await expect(page.getByText(content)).toBeVisible({
    timeout: LOGIN_TIMEOUT_MS,
  })
}

test.describe('Spec 7.7 — Privacy Tiers create-and-render', () => {
  test.beforeAll(async () => {
    if (IS_PROD_MODE) return
    const ctx = await pwRequest.newContext()
    try {
      const res = await ctx.get(LOCAL_BACKEND_HEALTH_URL, { timeout: 5_000 })
      if (!res.ok()) {
        throw new Error(`Backend health check returned ${res.status()}`)
      }
    } finally {
      await ctx.dispose()
    }
  })

  // Consolidated single-test scenario sequence: sign in once, then exercise
  // all four visibility-tier paths through the InlineComposer. Single login
  // avoids burning Sarah's 5/15min auth rate-limit budget across 4 separate
  // sign-in calls.
  test('VisibilitySelector renders three chips; each tier creates a post with the matching icon', async ({
    page,
  }) => {
    await signInAsDevSeed(page)
    await page.goto('/prayer-wall')
    // Terms modal can re-fire after navigation; dismiss again if it appears.
    await dismissTermsModalIfPresent(page)

    // ─── Scenario 1: open composer; verify selector renders + creates Friends post ─
    // (Merged Scenario 1 + 2 to avoid a Cancel-button click — the existing
    // PrayerWall page has many ambient "Cancel" buttons that match the
    // generic getByRole('button', { name: 'Cancel' }) selector.)
    await openInlineComposer(page)
    const visibilityGroup = page.getByRole('radiogroup', {
      name: 'Post visibility',
    })
    await expect(visibilityGroup).toBeVisible()
    await expect(
      visibilityGroup.getByRole('radio', { name: /public/i }),
    ).toBeVisible()
    await expect(
      visibilityGroup.getByRole('radio', { name: /friends/i }),
    ).toBeVisible()
    await expect(
      visibilityGroup.getByRole('radio', { name: /private/i }),
    ).toBeVisible()
    await expect(
      visibilityGroup.getByRole('radio', { name: /public/i }),
    ).toHaveAttribute('aria-checked', 'true')

    // Now fill out and submit the Friends-tier post in this same composer
    // session, avoiding the need to cancel.
    const friendsContent = `Spec 7.7 Friends-tier ${Date.now()}`
    await page.getByLabel('Prayer request').fill(friendsContent)
    await page
      .getByRole('radiogroup', { name: 'Prayer category' })
      .first()
      .getByRole('radio', { name: 'Health', exact: true })
      .click()
    await visibilityGroup.getByRole('radio', { name: /friends/i }).click()
    await page.getByRole('button', { name: 'Submit Prayer Request' }).click()
    await expect(page.getByText(friendsContent)).toBeVisible({
      timeout: LOGIN_TIMEOUT_MS,
    })
    await expect(
      page.getByLabel('Visible to friends only').first(),
    ).toBeVisible()

    // ─── Scenario 2: Private-tier post creates with Lock icon ──────────
    const privateContent = `Spec 7.7 Private-tier ${Date.now()}`
    await createPostWithVisibility(page, privateContent, 'private')
    await expect(page.getByLabel(/Private —/).first()).toBeVisible()

    // ─── Scenario 3: Public-tier post renders WITHOUT a visibility icon ─
    const publicContent = `Spec 7.7 Public-tier ${Date.now()}`
    await createPostWithVisibility(page, publicContent, 'public')
    const publicCard = page
      .getByText(publicContent)
      .first()
      .locator('xpath=ancestor::article[1]')
    await expect(publicCard.getByLabel('Visible to friends only')).toHaveCount(0)
    await expect(publicCard.getByLabel(/Private —/)).toHaveCount(0)
  })
})
