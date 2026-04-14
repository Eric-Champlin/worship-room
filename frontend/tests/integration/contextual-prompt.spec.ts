/**
 * BB-41: Contextual notification prompt integration test.
 *
 * Verifies that the NotificationPrompt component appears in the BibleReader
 * when the user reads a second Bible chapter on the same day (delta: 'same-day').
 *
 * The trigger logic lives in BibleReader.tsx's read-tracking useEffect:
 *   1. recordReadToday() from streakStore returns delta === 'same-day'
 *   2. getPushSupportStatus() !== 'unsupported'
 *   3. getPermissionState() === 'default'
 *   4. wr_notification_prompt_dismissed !== 'true'
 *
 * Note: Playwright Chromium reports Notification.permission as 'denied' by
 * default. We override it to 'default' via addInitScript so the prompt
 * condition can be satisfied.
 *
 * Prerequisites: dev server running on localhost:5173.
 */
import { test, expect } from '@playwright/test'

// Today's date in YYYY-MM-DD format (local timezone, matching getTodayLocal())
function getTodayLocal(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

test.describe('BB-41: Contextual notification prompt', () => {
  test.beforeEach(async ({ page }) => {
    // Suppress first-run overlay
    await page.addInitScript(() => {
      localStorage.setItem('wr_first_run_completed', Date.now().toString())
    })
  })

  test('prompt appears when user visits a second chapter on the same day', async ({ page }) => {
    const today = getTodayLocal()

    // Override Notification.permission to 'default' — Playwright Chromium
    // defaults to 'denied' which would prevent the prompt from showing.
    await page.addInitScript(() => {
      Object.defineProperty(Notification, 'permission', {
        get: () => 'default' as NotificationPermission,
        configurable: true,
      })
    })

    // Pre-seed localStorage so recordReadToday() returns delta: 'same-day':
    // - bible:streak has lastReadDate = today (simulating a first read already happened)
    // - wr_notification_prompt_dismissed is absent (prompt not yet dismissed)
    await page.addInitScript(
      ({ today }) => {
        const streakRecord = {
          currentStreak: 1,
          longestStreak: 1,
          lastReadDate: today,
          streakStartDate: today,
          graceDaysAvailable: 1,
          graceDaysUsedThisWeek: 0,
          lastGraceUsedDate: null,
          weekResetDate: '',
          milestones: [],
          totalDaysRead: 1,
        }
        localStorage.setItem('bible:streak', JSON.stringify(streakRecord))

        // Auth simulation
        localStorage.setItem('wr_auth_simulated', 'true')
        localStorage.setItem('wr_user_name', 'Test User')
      },
      { today },
    )

    // Navigate to a Bible chapter — this fires the read-tracking useEffect.
    // Genesis 1 is a safe, always-available chapter.
    await page.goto('/bible/genesis/1')
    await page.waitForLoadState('networkidle').catch(() => {})

    // The NotificationPrompt has role="complementary" with aria-label="Notification prompt"
    const prompt = page.getByRole('complementary', { name: 'Notification prompt' })

    // Wait for the prompt to appear (it has a slide-up entrance animation)
    await expect(prompt).toBeVisible({ timeout: 8000 })

    // Verify expected content
    await expect(prompt.getByText('Never miss your daily verse')).toBeVisible()
    await expect(prompt.getByRole('button', { name: 'Enable' })).toBeVisible()
    await expect(prompt.getByRole('button', { name: 'Maybe later' })).toBeVisible()
  })

  test('prompt does NOT appear on the first read of the day', async ({ page }) => {
    // Override to 'default' so the only reason for NOT showing is the delta
    await page.addInitScript(() => {
      Object.defineProperty(Notification, 'permission', {
        get: () => 'default' as NotificationPermission,
        configurable: true,
      })
    })

    // Pre-seed localStorage with a streak that has NO read today —
    // lastReadDate is yesterday, so recordReadToday() returns
    // delta: 'extended', NOT 'same-day'.
    await page.addInitScript(() => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const y = yesterday.getFullYear()
      const m = String(yesterday.getMonth() + 1).padStart(2, '0')
      const d = String(yesterday.getDate()).padStart(2, '0')
      const lastReadDate = `${y}-${m}-${d}`

      const streakRecord = {
        currentStreak: 3,
        longestStreak: 5,
        lastReadDate: lastReadDate,
        streakStartDate: '2025-01-01',
        graceDaysAvailable: 1,
        graceDaysUsedThisWeek: 0,
        lastGraceUsedDate: null,
        weekResetDate: '',
        milestones: [],
        totalDaysRead: 10,
      }
      localStorage.setItem('bible:streak', JSON.stringify(streakRecord))

      localStorage.setItem('wr_auth_simulated', 'true')
      localStorage.setItem('wr_user_name', 'Test User')
    })

    await page.goto('/bible/genesis/1')
    await page.waitForLoadState('networkidle').catch(() => {})

    // Wait for the chapter content to render (verses are present)
    await expect(page.locator('[data-verse]').first()).toBeVisible({ timeout: 8000 })

    // The prompt should NOT appear because delta is 'extended', not 'same-day'
    const prompt = page.getByRole('complementary', { name: 'Notification prompt' })
    await page.waitForTimeout(1500)
    await expect(prompt).not.toBeVisible()
  })

  test('prompt does NOT appear if already dismissed', async ({ page }) => {
    const today = getTodayLocal()

    await page.addInitScript(() => {
      Object.defineProperty(Notification, 'permission', {
        get: () => 'default' as NotificationPermission,
        configurable: true,
      })
    })

    // Pre-seed: same-day read conditions met, BUT prompt already dismissed
    await page.addInitScript(
      ({ today }) => {
        const streakRecord = {
          currentStreak: 1,
          longestStreak: 1,
          lastReadDate: today,
          streakStartDate: today,
          graceDaysAvailable: 1,
          graceDaysUsedThisWeek: 0,
          lastGraceUsedDate: null,
          weekResetDate: '',
          milestones: [],
          totalDaysRead: 1,
        }
        localStorage.setItem('bible:streak', JSON.stringify(streakRecord))
        localStorage.setItem('wr_notification_prompt_dismissed', 'true')
        localStorage.setItem('wr_auth_simulated', 'true')
        localStorage.setItem('wr_user_name', 'Test User')
      },
      { today },
    )

    await page.goto('/bible/genesis/1')
    await page.waitForLoadState('networkidle').catch(() => {})

    // Wait for content to render
    await expect(page.locator('[data-verse]').first()).toBeVisible({ timeout: 8000 })

    const prompt = page.getByRole('complementary', { name: 'Notification prompt' })
    await page.waitForTimeout(1500)
    await expect(prompt).not.toBeVisible()
  })

  test('dismissing the prompt sets localStorage flag', async ({ page }) => {
    const today = getTodayLocal()

    await page.addInitScript(() => {
      Object.defineProperty(Notification, 'permission', {
        get: () => 'default' as NotificationPermission,
        configurable: true,
      })
    })

    await page.addInitScript(
      ({ today }) => {
        const streakRecord = {
          currentStreak: 1,
          longestStreak: 1,
          lastReadDate: today,
          streakStartDate: today,
          graceDaysAvailable: 1,
          graceDaysUsedThisWeek: 0,
          lastGraceUsedDate: null,
          weekResetDate: '',
          milestones: [],
          totalDaysRead: 1,
        }
        localStorage.setItem('bible:streak', JSON.stringify(streakRecord))
        localStorage.setItem('wr_auth_simulated', 'true')
        localStorage.setItem('wr_user_name', 'Test User')
      },
      { today },
    )

    await page.goto('/bible/genesis/1')
    await page.waitForLoadState('networkidle').catch(() => {})

    const prompt = page.getByRole('complementary', { name: 'Notification prompt' })
    await expect(prompt).toBeVisible({ timeout: 8000 })

    // Dismiss the overlapping "Routine shortcut" pill (z-9999) that sits at the
    // bottom of the viewport and intercepts pointer events on the notification prompt.
    await page.evaluate(() => {
      const routinePill = document.querySelector('[aria-label="Routine shortcut"]')
      if (routinePill instanceof HTMLElement) {
        routinePill.style.display = 'none'
      }
    })

    // Click "Maybe later" to dismiss
    await prompt.getByRole('button', { name: 'Maybe later' }).click()

    // Prompt should disappear
    await expect(prompt).not.toBeVisible()

    // localStorage flag should be set
    const dismissed = await page.evaluate(() =>
      localStorage.getItem('wr_notification_prompt_dismissed'),
    )
    expect(dismissed).toBe('true')
  })
})
