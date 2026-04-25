import type { Page } from '@playwright/test'

/**
 * Seed wr_onboarding_complete so Dashboard's onboarding gate is satisfied.
 * Granular helper for tests that don't need the mood check-in skip.
 */
export async function seedOnboardingComplete(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem('wr_onboarding_complete', 'true')
  })
}

/**
 * Seed a defensively-complete MoodEntry for today so Dashboard's check_in
 * gate (hasCheckedInToday) is satisfied. Populates every required field of
 * the MoodEntry interface in frontend/src/types/dashboard.ts so downstream
 * consumers (mood chart widget, insights) don't crash when they render a
 * test entry. Date is today's local date (matches getLocalDateString's
 * format in frontend/src/utils/date.ts).
 */
export async function seedTodaysMoodCheckIn(page: Page) {
  await page.evaluate(() => {
    const d = new Date()
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    localStorage.setItem(
      'wr_mood_entries',
      JSON.stringify([
        {
          id: 'playwright-seed-mood-entry',
          date: today,
          mood: 3,
          moodLabel: 'Okay',
          timestamp: Date.now(),
          verseSeen: 'Psalm 46:10',
        },
      ]),
    )
  })
}

/**
 * Skip the pre-Dashboard gates (onboarding WelcomeWizard + daily MoodCheckIn).
 * This is the canonical helper for Phase 1+ E2E tests that verify
 * authenticated state propagating to Dashboard, Navbar, and /users/me
 * hydration. Onboarding and the daily mood check-in each have their own
 * separate specs and are not what auth-roundtrip tests claim to cover.
 * Without these seeds, Dashboard renders `phase === 'onboarding'` or
 * `phase === 'check_in'` for every freshly-authenticated test user (empty
 * localStorage in Playwright's fresh browser context), which replaces
 * Navbar with a full-screen modal and makes the 'User menu' assertion
 * impossible.
 *
 * Dashboard's phase ladder (frontend/src/pages/Dashboard.tsx): onboarding →
 * welcome_back → check_in → dashboard. welcome_back requires 3+ days of
 * inactivity (inactive for fresh-context test users), so seeding past
 * onboarding and check_in is sufficient to land in the dashboard phase.
 *
 * Called right after the first page.goto() on the test origin. localStorage
 * is per-origin and persists across subsequent page.goto() calls within the
 * same origin (e.g., registerFreshUser's trailing page.goto('/')), so a
 * single seed covers the whole flow — no re-seed needed after later navs.
 */
export async function seedSkipDashboardGates(page: Page) {
  await seedOnboardingComplete(page)
  await seedTodaysMoodCheckIn(page)
}
