/**
 * BB-38 (verification fix): Routing-table-aware e2e test for the Bible search
 * deep-link contract.
 *
 * Why this test exists: during the `/verify-with-playwright` run for BB-38,
 * Finding 1 showed that BB-38's hooks were wired into `BibleBrowser.tsx` but
 * the Bible redesign had moved `/bible` routing to `BibleLanding`, silently
 * orphaning the search deep-link contract. Component-level unit tests of
 * `BibleBrowser` kept passing because they rendered the component in
 * isolation with `MemoryRouter` — they never asked "is this component
 * actually reachable from `App.tsx`?"
 *
 * This test runs against the live dev server and goes through the real
 * routing table. If a future refactor moves `/bible` routing again without
 * porting the search deep-link wiring, this test will fail loudly.
 *
 * Prerequisites: the frontend dev server must be running on localhost:5173.
 * Run with `pnpm dev` in another terminal, then `npx playwright test
 * e2e/bb38-search-deeplink.spec.ts`.
 */
import { test, expect } from '@playwright/test';

test.describe('BB-38 search deep-link (routing-table aware)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('cold-load /bible?mode=search&q=love renders search panel with query pre-filled', async ({
    page,
  }) => {
    await page.goto('/bible?mode=search&q=love');
    await page.waitForLoadState('networkidle').catch(() => {});

    // The BibleSearchMode input (id="bible-search-input") must be visible and
    // pre-populated. This is the core BB-38 contract: cold-loading a search
    // URL from an external link (email, share sheet, bookmark) restores
    // search state without requiring the user to re-type.
    const searchInput = page.locator('#bible-search-input');
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await expect(searchInput).toHaveValue('love');

    // The inline "Back to Bible" exit link must be present for navigation
    // back to landing mode without relying on browser back or global nav.
    await expect(page.getByRole('button', { name: /back to bible/i })).toBeVisible();
  });

  test('cold-load /bible/search?q=love redirects and renders search panel', async ({ page }) => {
    await page.goto('/bible/search?q=love');
    await page.waitForLoadState('networkidle').catch(() => {});

    // The legacy path redirects to the canonical form. After the redirect
    // settles, the URL should contain ?mode=search&q=love AND the search
    // panel should render.
    await expect(page).toHaveURL(/\/bible\?mode=search&q=love/);

    const searchInput = page.locator('#bible-search-input');
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await expect(searchInput).toHaveValue('love');
  });

  test('cold-load /bible (default) renders landing, NOT search mode', async ({ page }) => {
    await page.goto('/bible');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Default /bible is the landing page: BibleSearchEntry's type="search"
    // input is present, BibleSearchMode (id="bible-search-input") is NOT.
    await expect(page.locator('#bible-search-input')).toHaveCount(0);
    await expect(page.getByRole('searchbox')).toBeVisible();
    await expect(page.getByRole('button', { name: /back to bible/i })).toHaveCount(0);
  });
});
