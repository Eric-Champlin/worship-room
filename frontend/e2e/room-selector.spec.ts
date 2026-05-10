/**
 * Spec 4.8 — RoomSelector E2E
 *
 * Frontend-only E2E. RoomSelector behavior is pure client-side URL-state
 * mirroring. Mock-data flag-off path renders correctly without a backend.
 * Run against dev server (pnpm dev on :5173) — no backend required.
 */
import { test, expect } from '@playwright/test'

test.describe('RoomSelector — Spec 4.8', () => {
  test('selecting Testimonies updates URL and activates the pill', async ({ page }) => {
    await page.goto('/prayer-wall')
    const roomToolbar = page.getByRole('toolbar', { name: 'Filter by post type' })
    await roomToolbar.getByRole('button', { name: 'Testimonies' }).click()
    await expect(page).toHaveURL(/[?&]postType=testimony/)
    await expect(
      roomToolbar.getByRole('button', { name: 'Testimonies' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(roomToolbar.getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  test('combined filter — Testimonies + Health activates both UIs', async ({ page }) => {
    await page.goto('/prayer-wall')
    const roomToolbar = page.getByRole('toolbar', { name: 'Filter by post type' })
    const categoryToolbar = page.getByRole('toolbar', {
      name: 'Filter prayers by category',
    })
    await roomToolbar.getByRole('button', { name: 'Testimonies' }).click()
    await categoryToolbar.getByRole('button', { name: /^Health/ }).click()
    await expect(page).toHaveURL(
      /(postType=testimony.*category=health|category=health.*postType=testimony)/,
    )
    await expect(
      roomToolbar.getByRole('button', { name: 'Testimonies' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(
      categoryToolbar.getByRole('button', { name: /^Health/ }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  test('rapid filter switching does not corrupt URL state', async ({ page }) => {
    await page.goto('/prayer-wall')
    const roomToolbar = page.getByRole('toolbar', { name: 'Filter by post type' })
    await roomToolbar.getByRole('button', { name: 'Testimonies' }).click()
    await roomToolbar.getByRole('button', { name: 'Encouragements' }).click()
    await roomToolbar.getByRole('button', { name: 'All' }).click()
    await expect(page).toHaveURL(/\/prayer-wall(\?|$)/)
    await expect(page).not.toHaveURL(/postType=/)
    await expect(roomToolbar.getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('mobile (375×667) — both filter toolbars remain visible on scroll', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/prayer-wall')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(500)
    const roomToolbar = page.getByRole('toolbar', { name: 'Filter by post type' })
    const categoryToolbar = page.getByRole('toolbar', {
      name: 'Filter prayers by category',
    })
    // Scroll the page down past the hero so the sticky filter activates.
    // `window.scrollTo` is deterministic; `mouse.wheel` was flaky in headless
    // and previously passed only because the broken sticky CSS kept the
    // toolbars in their initial DOM positions. Post-fix (overflow-x-clip on
    // BackgroundCanvas), sticky clamps to top:0 of the viewport.
    await page.evaluate(() => window.scrollTo(0, 1500))
    await page.waitForTimeout(400)
    await expect(roomToolbar).toBeInViewport()
    await expect(categoryToolbar).toBeInViewport()
  })
})
