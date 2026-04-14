import { test, expect, Page } from '@playwright/test';

// ─── Noise Filters (from full-site-audit.spec.ts) ──────────────────────────
const IGNORE_PATTERNS = [
  '[vite]',
  'favicon.ico',
  'chrome-extension://',
  '[HMR]',
  'hmr',
  'Hot Module',
  'WebSocket',
  'ws://localhost',
  'net::ERR_FILE_NOT_FOUND',
  'net::ERR_ABORTED',
  'Download the React DevTools',
  'React DevTools',
  'downloadable font',
  'third-party cookie',
  'Autofocus processing',
];

function shouldIgnore(msg: string): boolean {
  return IGNORE_PATTERNS.some((p) => msg.includes(p));
}

// ─── Auth Simulation ────────────────────────────────────────────────────────
function buildAuthInitScript(): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;

  const tooltipsSeen = JSON.stringify({
    'dashboard-quick-actions': true,
    'daily-hub-tabs': true,
    'prayer-wall-composer': true,
    'music-ambient-tab': true,
  });
  const moodEntry = JSON.stringify([
    {
      id: 'audit-mood-1',
      date: dateStr,
      mood: 4,
      moodLabel: 'Good',
      text: '',
      timestamp: Date.now(),
      verseSeen: 'Psalm 107:1',
      timeOfDay: 'morning',
    },
  ]);

  return `
    localStorage.setItem('wr_auth_simulated', 'true');
    localStorage.setItem('wr_user_name', 'Test User');
    localStorage.setItem('wr_user_id', 'audit-user-001');
    localStorage.setItem('wr_onboarding_complete', 'true');
    localStorage.setItem('wr_tooltips_seen', '${tooltipsSeen.replace(/'/g, "\\'")}');
    localStorage.setItem('wr_getting_started_complete', 'true');
    localStorage.setItem('wr_mood_entries', '${moodEntry.replace(/'/g, "\\'")}');
    localStorage.setItem('wr_first_run_completed', '${Date.now()}');
  `;
}

// ─── Types ──────────────────────────────────────────────────────────────────
interface RouteSpec {
  route: string;
  auth: boolean;
  label: string;
  keySelector: string; // CSS selector for the key element that must be visible
}


// ─── Route Definitions ──────────────────────────────────────────────────────
const ROUTES: RouteSpec[] = [
  // Public routes
  { route: '/', auth: false, label: '/ (logged-out)', keySelector: 'h1' },
  { route: '/', auth: true, label: '/ (authenticated)', keySelector: '[data-testid="dashboard"], h1' },
  { route: '/bible/john/3?verse=16', auth: false, label: '/bible/john/3?verse=16', keySelector: '[data-testid="bible-reader"], main, h1' },
  { route: '/bible/genesis/1', auth: false, label: '/bible/genesis/1', keySelector: '[data-testid="bible-reader"], main, h1' },
  { route: '/bible', auth: false, label: '/bible', keySelector: '[data-testid="bible-browser"], main, h1' },
  { route: '/bible?mode=search&q=love', auth: false, label: '/bible?mode=search&q=love', keySelector: '[data-testid="bible-browser"], main, h1' },
  { route: '/bible/my', auth: true, label: '/bible/my (authenticated)', keySelector: 'main, h1, h2' },
  { route: '/daily?tab=devotional', auth: false, label: '/daily?tab=devotional', keySelector: 'main, h1, h2, article, [role="tabpanel"]' },
  { route: '/daily?tab=pray', auth: false, label: '/daily?tab=pray', keySelector: 'textarea, [role="tabpanel"]' },
  { route: '/daily?tab=journal', auth: false, label: '/daily?tab=journal', keySelector: '#tabpanel-journal, textarea' },
  { route: '/daily?tab=meditate', auth: false, label: '/daily?tab=meditate', keySelector: '[role="tabpanel"], main' },
  { route: '/ask', auth: false, label: '/ask', keySelector: 'main, h1, textarea, input' },
  { route: '/prayer-wall', auth: false, label: '/prayer-wall', keySelector: 'main, h1' },
  { route: '/prayer-wall/user/mock-1', auth: false, label: '/prayer-wall/user/mock-1', keySelector: 'main, h1, h2' },
  { route: '/settings', auth: true, label: '/settings (authenticated)', keySelector: 'main, h1, h2' },
  { route: '/grow', auth: false, label: '/grow', keySelector: 'main, h1' },
  { route: '/insights', auth: true, label: '/insights (authenticated)', keySelector: 'main, h1, h2' },
  { route: '/friends', auth: true, label: '/friends (authenticated)', keySelector: 'main, h1, h2' },
  { route: '/friends?tab=leaderboard', auth: true, label: '/friends?tab=leaderboard (authenticated)', keySelector: 'main, h1, h2' },
  { route: '/music', auth: false, label: '/music', keySelector: 'main, h1' },
  { route: '/register', auth: false, label: '/register', keySelector: 'main, h1, h2, form' },
  { route: '/my-prayers', auth: true, label: '/my-prayers (authenticated)', keySelector: 'main, h1, h2' },
  { route: '/nonexistent-route', auth: false, label: '/nonexistent-route (404)', keySelector: 'main, h1' },
  { route: '/local-support/churches', auth: false, label: '/local-support/churches', keySelector: 'main, h1' },
  { route: '/meditate/breathing', auth: true, label: '/meditate/breathing (authenticated)', keySelector: 'main, h1, h2, button' },
];

// ─── Helper: audit a single route at a given viewport ───────────────────────
async function auditRouteAtViewport(
  page: Page,
  route: string,
  keySelector: string,
  vpWidth: number,
  vpHeight: number,
): Promise<{
  renders: boolean;
  horizontalOverflow: boolean;
  keyElementVisible: boolean;
  consoleErrors: string[];
  jsErrors: string[];
}> {
  const consoleErrors: string[] = [];
  const jsErrors: string[] = [];

  page.on('console', (msg) => {
    const text = msg.text();
    if (shouldIgnore(text)) return;
    if (msg.type() === 'error') consoleErrors.push(text);
  });

  page.on('pageerror', (err) => {
    const text = err.message || String(err);
    if (!shouldIgnore(text)) jsErrors.push(text);
  });

  await page.setViewportSize({ width: vpWidth, height: vpHeight });

  const baseUrl = 'http://localhost:5173';
  const fullUrl = `${baseUrl}${route}`;

  try {
    await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 15000 });
  } catch {
    try {
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);
    } catch {
      // Page failed to load
      page.removeAllListeners('console');
      page.removeAllListeners('pageerror');
      return { renders: false, horizontalOverflow: false, keyElementVisible: false, consoleErrors, jsErrors };
    }
  }

  await page.waitForTimeout(800);

  const bodyLength = await page.evaluate(() => document.body.innerText.length);
  const renders = bodyLength > 50;

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  );

  // Check key element — try each selector in the comma-separated list
  let keyElementVisible = false;
  const selectors = keySelector.split(',').map((s) => s.trim());
  for (const sel of selectors) {
    if (keyElementVisible) break;
    try {
      const locator = page.locator(sel);
      const count = await locator.count();
      for (let i = 0; i < count; i++) {
        const visible = await locator.nth(i).isVisible();
        if (visible) {
          keyElementVisible = true;
          break;
        }
      }
    } catch {
      // selector failed, try next
    }
  }

  page.removeAllListeners('console');
  page.removeAllListeners('pageerror');

  return { renders, horizontalOverflow, keyElementVisible, consoleErrors, jsErrors };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe('BB-37 Full-Site Audit', () => {
  test.setTimeout(300000); // 5 minutes for the entire suite

  test.describe('Public routes', () => {
    const publicRoutes = ROUTES.filter((r) => !r.auth);

    for (const spec of publicRoutes) {
      test(`${spec.label} renders correctly`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        const results375 = await auditRouteAtViewport(page, spec.route, spec.keySelector, 375, 812);
        await page.close();

        const page2 = await context.newPage();
        const results1440 = await auditRouteAtViewport(page2, spec.route, spec.keySelector, 1440, 900);
        await page2.close();
        await context.close();

        // Page renders
        expect(results375.renders || results1440.renders, `${spec.label} should render content`).toBe(true);

        // No critical console errors
        const allConsoleErrors = [...results375.consoleErrors, ...results1440.consoleErrors];
        expect(allConsoleErrors, `${spec.label} should have no console errors`).toEqual([]);

        // No horizontal overflow
        expect(results375.horizontalOverflow, `${spec.label} should have no horizontal overflow at 375px`).toBe(false);
        expect(results1440.horizontalOverflow, `${spec.label} should have no horizontal overflow at 1440px`).toBe(false);

        // Key element visible (at least at one viewport)
        expect(
          results375.keyElementVisible || results1440.keyElementVisible,
          `${spec.label} should have key element visible`,
        ).toBe(true);

        // No JS errors
        const allJsErrors = [...results375.jsErrors, ...results1440.jsErrors];
        expect(allJsErrors, `${spec.label} should have no JS errors`).toEqual([]);
      });
    }
  });

  test.describe('Authenticated routes', () => {
    const authRoutes = ROUTES.filter((r) => r.auth);

    for (const spec of authRoutes) {
      test(`${spec.label} renders correctly`, async ({ browser }) => {
        const context375 = await browser.newContext();
        await context375.addInitScript(buildAuthInitScript());
        const page375 = await context375.newPage();
        const results375 = await auditRouteAtViewport(page375, spec.route, spec.keySelector, 375, 812);
        await page375.close();
        await context375.close();

        const context1440 = await browser.newContext();
        await context1440.addInitScript(buildAuthInitScript());
        const page1440 = await context1440.newPage();
        const results1440 = await auditRouteAtViewport(page1440, spec.route, spec.keySelector, 1440, 900);
        await page1440.close();
        await context1440.close();

        // Page renders
        expect(results375.renders || results1440.renders, `${spec.label} should render content`).toBe(true);

        // No critical console errors
        const allConsoleErrors = [...results375.consoleErrors, ...results1440.consoleErrors];
        expect(allConsoleErrors, `${spec.label} should have no console errors`).toEqual([]);

        // No horizontal overflow
        expect(results375.horizontalOverflow, `${spec.label} should have no horizontal overflow at 375px`).toBe(false);
        expect(results1440.horizontalOverflow, `${spec.label} should have no horizontal overflow at 1440px`).toBe(false);

        // Key element visible (at least at one viewport)
        expect(
          results375.keyElementVisible || results1440.keyElementVisible,
          `${spec.label} should have key element visible`,
        ).toBe(true);

        // No JS errors
        const allJsErrors = [...results375.jsErrors, ...results1440.jsErrors];
        expect(allJsErrors, `${spec.label} should have no JS errors`).toEqual([]);
      });
    }
  });
});
