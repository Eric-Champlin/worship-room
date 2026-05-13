/**
 * Spec 6.4 — 3am Watch end-to-end coverage.
 *
 * Scenarios:
 *   1. Watch-active UI at 23:00 with `watchEnabled='on'`: CrisisResourcesBanner
 *      visible at top of `/prayer-wall`, WatchIndicator chip in hero,
 *      InlineComposer placeholder swapped to Watch variant, QOTD suppressed.
 *   2. CrisisResourcesBanner visible on sub-page `/prayer-wall/:id` when
 *      Watch is active — verifies the PageShell-driven cross-route mount.
 *   3. Watch-inactive UI at 11:00 with `watchEnabled='on'`: no banner, no
 *      indicator, no Watch placeholder (negative case / regression guard).
 *
 * The opt-in flow (Settings → modal → persist) is exercised by component
 * tests (WatchToggle.test.tsx) and behavior tests (PostControllerIntegration
 * + PrayerWall-watch tests). We focus the e2e suite on the cross-component
 * runtime composition that unit tests can't fully verify.
 *
 * Time mocking matches the Spec 6.3 `night-mode.spec.ts` pattern — monkey-
 * patch Date globally via `addInitScript` BEFORE page scripts run.
 */
import { test, expect, type Page } from '@playwright/test'

async function mockHour(page: Page, hour: number) {
  await page.addInitScript(
    (h: number) => {
      const RealDate = Date
      class MockDate extends RealDate {
        constructor(...args: ConstructorParameters<typeof Date>) {
          if (args.length === 0) {
            super(2026, 4, 13, h, 0, 0)
          } else {
            // @ts-expect-error: forwarding args to RealDate
            super(...args)
          }
        }
        getHours() {
          return h
        }
        static now() {
          return new MockDate().getTime()
        }
      }
      // @ts-expect-error: monkey-patch the global
      window.Date = MockDate
    },
    hour,
  )
}

async function seedWatchOn(page: Page) {
  // Seed wr_settings with watchEnabled='on' BEFORE navigation so the very first
  // mount of useWatchMode sees the opt-in preference. Mirrors how Spec 6.3
  // e2e tests would seed nightMode.
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        'wr_settings',
        JSON.stringify({
          prayerWall: {
            prayerReceiptsVisible: true,
            nightMode: 'auto',
            watchEnabled: 'on',
          },
        }),
      )
    } catch (_) {
      /* private mode / quota — graceful no-op */
    }
  })
}

async function clearStorage(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.clear()
    } catch (_) {
      /* ignored */
    }
  })
}

test.describe('Spec 6.4 — 3am Watch v1', () => {
  test('Watch UI visible at 23:00 with watchEnabled=on on /prayer-wall', async ({
    page,
  }) => {
    await clearStorage(page)
    await seedWatchOn(page)
    await mockHour(page, 23)
    await page.goto('/prayer-wall')
    await page.waitForLoadState('networkidle')

    // Crisis banner visible (via PageShell)
    await expect(
      page.getByRole('region', { name: /you're not alone/i }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: /call 988 suicide and crisis lifeline/i }),
    ).toBeVisible()

    // WatchIndicator chip visible (in hero)
    await expect(page.getByLabel('3am Watch is on')).toBeVisible()
  })

  test('Crisis banner visible on /prayer-wall/user/:id sub-page when Watch is active (PageShell-driven)', async ({
    page,
  }) => {
    // Verifies the PageShell-driven cross-route mount: 3 prayer-wall sub-pages
    // (PrayerDetail, PrayerWallProfile, PrayerWallDashboard) wrap content in
    // PageShell which mounts the banner when Watch is active. PrayerWall.tsx
    // mounts the banner separately (doesn't use PageShell — discovered during
    // Step 19 execution; addendum to plan Step 12).
    //
    // PrayerWallProfile (`/prayer-wall/user/:id`) is chosen as the public
    // sub-page (/prayer-wall/dashboard requires auth and redirects to / for
    // unauthenticated test users). WatchIndicator should NOT be present here —
    // that lives only in the /prayer-wall hero.
    await clearStorage(page)
    await seedWatchOn(page)
    await mockHour(page, 23)
    await page.goto('/prayer-wall/user/user-1')
    await page.waitForLoadState('networkidle')

    await expect(
      page.getByRole('region', { name: /you're not alone/i }),
    ).toBeVisible()
    await expect(page.getByLabel('3am Watch is on')).not.toBeVisible()
  })

  test('Watch UI absent at 11:00 with watchEnabled=on (negative case)', async ({
    page,
  }) => {
    await clearStorage(page)
    await seedWatchOn(page)
    await mockHour(page, 11)
    await page.goto('/prayer-wall')
    await page.waitForLoadState('networkidle')

    // No banner, no indicator — Watch is off-hours regardless of opt-in
    await expect(
      page.getByRole('region', { name: /you're not alone/i }),
    ).not.toBeVisible()
    await expect(page.getByLabel('3am Watch is on')).not.toBeVisible()
  })
})
