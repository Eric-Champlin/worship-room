import { test, expect, Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ─── Route Definitions ───────────────────────────────────────────────────────

const publicRoutes = [
  '/',
  '/daily',
  '/daily?tab=devotional',
  '/daily?tab=pray',
  '/daily?tab=journal',
  '/daily?tab=meditate',
  '/prayer-wall',
  '/music',
  '/music?tab=playlists',
  '/music?tab=ambient',
  '/music?tab=sleep',
  '/music/routines',
  '/bible',
  '/ask',
  '/grow',
  '/grow?tab=plans',
  '/grow?tab=challenges',
  '/local-support/churches',
  '/local-support/counselors',
  '/local-support/celebrate-recovery',
  '/verse/1',
  '/login',
  '/register',
];

const protectedRoutes = [
  '/',
  '/insights',
  '/insights/monthly',
  '/friends',
  '/settings',
  '/my-prayers',
  '/profile/test-user-1',
];

const viewports = [
  { name: 'mobileS', width: 375, height: 812 },
  { name: 'mobileL', width: 428, height: 926 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'tabletL', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'desktopXL', width: 1920, height: 1080 },
];

// Pages that should NOT have dark theme — everything else should be dark
const lightThemeExceptions = ['/login', '/register'];

// ─── Noise Filters ──────────────────────────────────────────────────────────

const IGNORE_PATTERNS = [
  '[vite]',
  'favicon.ico',
  'chrome-extension://',
  '[HMR]',
  'hmr',
  'Hot Module',
  'WebSocket',
  'ws://localhost',
  'net::ERR_FILE_NOT_FOUND',       // placeholder audio files
  'net::ERR_ABORTED',              // cancelled navigations
  'Download the React DevTools',
  'React DevTools',
  'downloadable font',             // font load noise in CI
  'third-party cookie',
  'Autofocus processing',
];

function shouldIgnore(msg: string): boolean {
  return IGNORE_PATTERNS.some((p) => msg.includes(p));
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface RouteResult {
  route: string;
  viewport: string;
  auth: boolean;
  title: string;
  consoleErrors: string[];
  consoleWarnings: string[];
  networkFailures: string[];
  slowRequests: string[];
  horizontalOverflow: boolean;
  hasH1: boolean;
  hasCrisisFooter: boolean;
  hasNavbar: boolean;
  pageNotBlank: boolean;
  brokenImages: string[];
  fontsLoaded: { heading: string; body: string; pass: boolean };
  touchTargetIssues: { fails: string[]; warnings: string[] };
  darkTheme: { applicable: boolean; pass: boolean; bgColor: string };
  hasHorizontalScrollbar: boolean;
  overlappingFixedElements: string[];
  uncaughtRejections: string[];
  screenshotPath: string;
  verdict: 'PASS' | 'FAIL' | 'WARN';
  flaky: boolean;
  retried: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(route: string): string {
  return route
    .replace(/^\//, '')
    .replace(/[/?=&]/g, '-')
    .replace(/-+/g, '-')
    .replace(/-$/, '') || 'home';
}

function getLocalDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildAuthInitScript(): string {
  const today = getLocalDateString();
  const tooltipsSeen = JSON.stringify({
    'dashboard-quick-actions': true,
    'daily-hub-tabs': true,
    'prayer-wall-composer': true,
    'music-ambient-tab': true,
  });
  const moodEntry = JSON.stringify([
    {
      id: 'audit-mood-1',
      date: today,
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
    localStorage.setItem('wr_user_name', 'Eric');
    localStorage.setItem('wr_user_id', 'audit-user-001');
    localStorage.setItem('wr_onboarding_complete', 'true');
    localStorage.setItem('wr_tooltips_seen', '${tooltipsSeen.replace(/'/g, "\\'")}');
    localStorage.setItem('wr_getting_started_complete', 'true');
    localStorage.setItem('wr_mood_entries', '${moodEntry.replace(/'/g, "\\'")}');
  `;
}

// ─── Single-route audit logic ────────────────────────────────────────────────

async function auditRoute(
  page: Page,
  route: string,
  vpName: string,
  vpWidth: number,
  vpHeight: number,
  isAuthenticated: boolean,
): Promise<RouteResult> {
  const slug = isAuthenticated ? `auth-${slugify(route)}` : slugify(route);
  const screenshotDir = path.resolve('playwright-screenshots/audit');
  const screenshotFile = `${slug}-${vpName}.png`;
  const screenshotPath = path.join(screenshotDir, screenshotFile);

  await page.setViewportSize({ width: vpWidth, height: vpHeight });

  // Collectors
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  const consoleInfos: string[] = [];
  const networkFailures: string[] = [];
  const slowRequests: string[] = [];
  const uncaughtRejections: string[] = [];

  // Listen for console messages
  page.on('console', (msg) => {
    const text = msg.text();
    if (shouldIgnore(text)) return;
    if (msg.type() === 'error') consoleErrors.push(text);
    else if (msg.type() === 'warning') consoleWarnings.push(text);
    else consoleInfos.push(text);
  });

  // Listen for uncaught promise rejections
  page.on('pageerror', (err) => {
    const text = err.message || String(err);
    if (!shouldIgnore(text)) {
      uncaughtRejections.push(text);
    }
  });

  // Track request timings and failures
  const requestTimings = new Map<string, number>();
  page.on('request', (req) => {
    requestTimings.set(req.url(), Date.now());
  });
  page.on('response', (res) => {
    const url = res.url();
    const status = res.status();

    // Check for failed requests (>= 400) and CORS errors
    if (status >= 400) {
      const msg = `${status} ${res.statusText()} - ${url}`;
      if (!shouldIgnore(msg) && !shouldIgnore(url)) {
        networkFailures.push(msg);
      }
    }

    // Check for slow requests (> 2s)
    const start = requestTimings.get(url);
    if (start && Date.now() - start > 2000) {
      slowRequests.push(`${Date.now() - start}ms - ${url}`);
    }
  });

  // Navigate
  const baseUrl = 'http://localhost:5173';
  const fullUrl = route.startsWith('http') ? route : `${baseUrl}${route}`;

  try {
    await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 15000 });
  } catch {
    // If networkidle times out, at least wait for domcontentloaded
    try {
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);
    } catch {
      // Page failed to load at all
    }
  }

  // Brief settle time for dynamic content
  await page.waitForTimeout(500);

  // ─── Checks ──────────────────────────────────────────────────────────

  // 4) Page not blank
  const bodyLength = await page.evaluate(() => document.body.innerText.length);
  const pageNotBlank = bodyLength > 50;

  // 7) Page title
  const title = await page.title();

  // 10) Horizontal overflow
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );

  // 11) Has h1
  const hasH1 = (await page.locator('h1').count()) > 0;

  // 12) Crisis footer resources
  const footerText = await page.evaluate(() => {
    const footer = document.querySelector('footer');
    return footer?.innerText || '';
  });
  const hasCrisisFooter = footerText.includes('988') && footerText.includes('741741');

  // 13) Navbar
  const hasNavbar = await page.evaluate(() => {
    const nav = document.querySelector('nav');
    const logo = document.body.innerText.includes('Worship Room');
    return !!nav || logo;
  });

  // 14) Broken images
  const brokenImages = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs
      .filter((img) => {
        const style = window.getComputedStyle(img);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        return img.complete && img.naturalWidth === 0;
      })
      .map((img) => img.src || img.getAttribute('data-src') || '[no src]');
  });

  // 15) Font check
  const fontsLoaded = await page.evaluate(() => {
    const heading = document.querySelector('h1, h2, h3');
    const body = document.querySelector('p, span, div');
    const headingFont = heading ? window.getComputedStyle(heading).fontFamily : 'none';
    const bodyFont = body ? window.getComputedStyle(body).fontFamily : 'none';
    const headingOk =
      headingFont.toLowerCase().includes('caveat') ||
      headingFont.toLowerCase().includes('lora') ||
      headingFont.toLowerCase().includes('inter');
    const bodyOk = bodyFont.toLowerCase().includes('inter');
    return {
      heading: headingFont,
      body: bodyFont,
      pass: headingOk && bodyOk,
    };
  });

  // 16) Overlapping fixed elements
  const overlappingFixedElements = await page.evaluate(() => {
    const issues: string[] = [];
    const allFixed = Array.from(document.querySelectorAll('*')).filter((el) => {
      const style = window.getComputedStyle(el);
      return style.position === 'fixed' || style.position === 'sticky';
    });

    // Check if any fixed elements overlap main content area on initial load
    const mainContent = document.querySelector('main') || document.querySelector('#root > div');
    if (!mainContent) return issues;

    const mainRect = mainContent.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    for (const el of allFixed) {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      // Skip navbar (expected fixed/sticky)
      if (el.tagName === 'NAV' || el.closest('nav')) continue;
      // Skip elements at very top (likely navbar)
      if (rect.top < 80 && rect.bottom < 80) continue;
      // Skip all sticky-positioned elements (tab bars, map sidebars, etc.)
      if (style.position === 'sticky') continue;
      // Skip AudioPill and similar fixed floating controls near viewport bottom
      // (z-index 9999 or fixed within the bottom 80px of the viewport)
      const zIndex = parseInt(style.zIndex, 10);
      if (zIndex >= 9999) continue;
      if (style.position === 'fixed' && rect.bottom >= viewportHeight - 80) continue;

      // Check for actual visual overlap with main
      const overlaps =
        rect.left < mainRect.right &&
        rect.right > mainRect.left &&
        rect.top < mainRect.bottom &&
        rect.bottom > mainRect.top;

      if (overlaps) {
        const tag = el.tagName.toLowerCase();
        const cls = (el.className && typeof el.className === 'string')
          ? el.className.slice(0, 60)
          : '';
        issues.push(`${tag}.${cls} overlaps main content`);
      }
    }
    return issues;
  });

  // 17) Touch target check (mobile only)
  const isMobile = vpWidth <= 428;
  const touchTargetIssues = { fails: [] as string[], warnings: [] as string[] };
  if (isMobile) {
    const results = await page.evaluate(() => {
      const fails: string[] = [];
      const warnings: string[] = [];
      const elements = Array.from(
        document.querySelectorAll('button, a[role="button"], [role="button"]'),
      );
      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        if (rect.width === 0 || rect.height === 0) continue;

        const height = rect.height;
        const text = (el.textContent || '').trim().slice(0, 40);
        const tag = el.tagName.toLowerCase();
        const label = `<${tag}> "${text}" (${Math.round(rect.width)}x${Math.round(height)}px)`;

        if (height < 36) {
          fails.push(label);
        } else if (height < 44) {
          warnings.push(label);
        }
      }
      return { fails, warnings };
    });
    touchTargetIssues.fails = results.fails;
    touchTargetIssues.warnings = results.warnings;
  }

  // 18) Dark theme check — all pages except /login and /register stubs
  const isDarkThemePage = !lightThemeExceptions.includes(route);
  let darkTheme = { applicable: isDarkThemePage, pass: true, bgColor: '' };
  if (isDarkThemePage) {
    darkTheme = await page.evaluate(() => {
      const main =
        document.querySelector('main') ||
        document.querySelector('#root > div > div') ||
        document.body;
      const bg = window.getComputedStyle(main).backgroundColor;
      // Parse rgb(r, g, b) or rgba(r, g, b, a)
      const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const sum = parseInt(match[1]) + parseInt(match[2]) + parseInt(match[3]);
        return { applicable: true, pass: sum < 150, bgColor: bg };
      }
      // Transparent or unset — check body
      const bodyBg = window.getComputedStyle(document.body).backgroundColor;
      const bodyMatch = bodyBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (bodyMatch) {
        const sum = parseInt(bodyMatch[1]) + parseInt(bodyMatch[2]) + parseInt(bodyMatch[3]);
        return { applicable: true, pass: sum < 150, bgColor: bodyBg };
      }
      return { applicable: true, pass: false, bgColor: bg || bodyBg };
    });
  }

  // 19) Horizontal scrollbar check
  const hasHorizontalScrollbar = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });

  // Screenshot
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ path: screenshotPath, fullPage: true });

  // Determine verdict
  let verdict: 'PASS' | 'FAIL' | 'WARN' = 'PASS';
  if (
    consoleErrors.length > 0 ||
    networkFailures.length > 0 ||
    !pageNotBlank ||
    horizontalOverflow ||
    !hasCrisisFooter ||
    !hasNavbar ||
    brokenImages.length > 0 ||
    uncaughtRejections.length > 0 ||
    hasHorizontalScrollbar
  ) {
    verdict = 'FAIL';
  } else if (
    touchTargetIssues.fails.length > 0 ||
    touchTargetIssues.warnings.length > 0 ||
    overlappingFixedElements.length > 0 ||
    !fontsLoaded.pass ||
    !hasH1 ||
    (title === 'Worship Room' || !title)
  ) {
    verdict = 'WARN';
  }

  // Clean up listeners (they accumulate across routes)
  page.removeAllListeners('console');
  page.removeAllListeners('pageerror');
  page.removeAllListeners('request');
  page.removeAllListeners('response');

  return {
    route,
    viewport: `${vpWidth}x${vpHeight}`,
    auth: isAuthenticated,
    title,
    consoleErrors,
    consoleWarnings,
    networkFailures,
    slowRequests,
    horizontalOverflow,
    hasH1,
    hasCrisisFooter,
    hasNavbar,
    pageNotBlank,
    brokenImages,
    fontsLoaded,
    touchTargetIssues,
    darkTheme,
    hasHorizontalScrollbar,
    overlappingFixedElements,
    uncaughtRejections,
    screenshotPath,
    verdict,
    flaky: false,
    retried: false,
  };
}

// ─── Retry logic for failed routes ───────────────────────────────────────────

async function auditRouteWithRetry(
  context: BrowserContext,
  route: string,
  vpName: string,
  vpWidth: number,
  vpHeight: number,
  isAuthenticated: boolean,
): Promise<RouteResult> {
  const page = await context.newPage();
  try {
    const result = await auditRoute(page, route, vpName, vpWidth, vpHeight, isAuthenticated);

    if (result.verdict === 'FAIL') {
      // Retry once to check for flakiness
      await page.close();
      const retryPage = await context.newPage();
      try {
        const retryResult = await auditRoute(
          retryPage,
          route,
          vpName,
          vpWidth,
          vpHeight,
          isAuthenticated,
        );
        retryResult.retried = true;

        if (retryResult.verdict !== 'FAIL') {
          // First run failed, retry passed → flaky
          retryResult.flaky = true;
          return retryResult;
        }
        // Both failed → deterministic
        retryResult.flaky = false;
        return retryResult;
      } finally {
        await retryPage.close();
      }
    }

    return result;
  } finally {
    if (!page.isClosed()) await page.close();
  }
}

// ─── Report Generation ───────────────────────────────────────────────────────

function generateReport(results: RouteResult[]): string {
  const lines: string[] = [];
  const divider = '═'.repeat(180);
  const thinDivider = '─'.repeat(180);

  // ── Section 1: Summary Table ──
  lines.push('');
  lines.push(divider);
  lines.push('  FULL SITE AUDIT REPORT');
  lines.push(divider);
  lines.push('');

  const total = results.length;
  const passes = results.filter((r) => r.verdict === 'PASS').length;
  const fails = results.filter((r) => r.verdict === 'FAIL').length;
  const warns = results.filter((r) => r.verdict === 'WARN').length;
  const flakyCount = results.filter((r) => r.flaky).length;

  lines.push(`  Total checks: ${total}  |  PASS: ${passes}  |  FAIL: ${fails}  |  WARN: ${warns}  |  Flaky: ${flakyCount}`);
  lines.push('');
  lines.push(thinDivider);

  // Table header
  const header = [
    'Route'.padEnd(40),
    'VP'.padEnd(12),
    'Auth'.padEnd(5),
    'Title'.padEnd(35),
    'Errs'.padEnd(5),
    'Net'.padEnd(4),
    'OvFl'.padEnd(5),
    'H1'.padEnd(4),
    'Imgs'.padEnd(5),
    '988'.padEnd(4),
    'Nav'.padEnd(4),
    'Font'.padEnd(5),
    'Touch'.padEnd(6),
    'Dark'.padEnd(5),
    'Flaky'.padEnd(6),
    'Verdict',
  ].join(' | ');
  lines.push(header);
  lines.push(thinDivider);

  for (const r of results) {
    const row = [
      (r.auth ? '[A] ' : '    ').padEnd(0) + r.route.padEnd(36),
      r.viewport.padEnd(12),
      (r.auth ? 'Y' : 'N').padEnd(5),
      (r.title || '(empty)').slice(0, 33).padEnd(35),
      String(r.consoleErrors.length).padEnd(5),
      String(r.networkFailures.length).padEnd(4),
      (r.horizontalOverflow ? 'YES' : 'ok').padEnd(5),
      (r.hasH1 ? 'ok' : 'NO').padEnd(4),
      String(r.brokenImages.length).padEnd(5),
      (r.hasCrisisFooter ? 'ok' : 'NO').padEnd(4),
      (r.hasNavbar ? 'ok' : 'NO').padEnd(4),
      (r.fontsLoaded.pass ? 'ok' : 'NO').padEnd(5),
      (r.touchTargetIssues.fails.length > 0
        ? 'FAIL'
        : r.touchTargetIssues.warnings.length > 0
          ? 'WARN'
          : 'ok'
      ).padEnd(6),
      (!r.darkTheme.applicable ? 'n/a' : r.darkTheme.pass ? 'ok' : 'NO').padEnd(5),
      (r.flaky ? 'FLAKY' : r.retried ? 'determ' : '-').padEnd(6),
      r.verdict,
    ].join(' | ');
    lines.push(row);
  }

  lines.push(thinDivider);
  lines.push('');

  // ── Section 2: Detailed Error Log ──
  lines.push(divider);
  lines.push('  DETAILED ERROR LOG (Console Errors by Route)');
  lines.push(divider);
  lines.push('');

  const routesWithErrors = results.filter((r) => r.consoleErrors.length > 0);
  if (routesWithErrors.length === 0) {
    lines.push('  No console errors detected.');
  } else {
    const errorsByRoute = new Map<string, { viewport: string; errors: string[] }[]>();
    for (const r of routesWithErrors) {
      const key = `${r.auth ? '[AUTH] ' : ''}${r.route}`;
      if (!errorsByRoute.has(key)) errorsByRoute.set(key, []);
      errorsByRoute.get(key)!.push({ viewport: r.viewport, errors: r.consoleErrors });
    }
    for (const [route, entries] of errorsByRoute) {
      lines.push(`  ${route}`);
      for (const entry of entries) {
        for (const err of entry.errors) {
          lines.push(`    [${entry.viewport}] ${err.slice(0, 200)}`);
        }
      }
      lines.push('');
    }
  }

  // Network failures
  const routesWithNetFail = results.filter((r) => r.networkFailures.length > 0);
  if (routesWithNetFail.length > 0) {
    lines.push(thinDivider);
    lines.push('  NETWORK FAILURES');
    lines.push(thinDivider);
    for (const r of routesWithNetFail) {
      lines.push(`  ${r.auth ? '[AUTH] ' : ''}${r.route} [${r.viewport}]`);
      for (const f of r.networkFailures) {
        lines.push(`    ${f.slice(0, 200)}`);
      }
    }
    lines.push('');
  }

  // Uncaught rejections
  const routesWithRejections = results.filter((r) => r.uncaughtRejections.length > 0);
  if (routesWithRejections.length > 0) {
    lines.push(thinDivider);
    lines.push('  UNCAUGHT PROMISE REJECTIONS');
    lines.push(thinDivider);
    for (const r of routesWithRejections) {
      lines.push(`  ${r.auth ? '[AUTH] ' : ''}${r.route} [${r.viewport}]`);
      for (const rej of r.uncaughtRejections) {
        lines.push(`    ${rej.slice(0, 200)}`);
      }
    }
    lines.push('');
  }

  // Slow requests
  const routesWithSlow = results.filter((r) => r.slowRequests.length > 0);
  if (routesWithSlow.length > 0) {
    lines.push(thinDivider);
    lines.push('  SLOW REQUESTS (>2s)');
    lines.push(thinDivider);
    for (const r of routesWithSlow) {
      lines.push(`  ${r.auth ? '[AUTH] ' : ''}${r.route} [${r.viewport}]`);
      for (const s of r.slowRequests) {
        lines.push(`    ${s}`);
      }
    }
    lines.push('');
  }

  // ── Section 3: Warnings ──
  lines.push(divider);
  lines.push('  WARNINGS (Touch Targets, Z-Index, Fonts, Missing H1, SEO Titles)');
  lines.push(divider);
  lines.push('');

  // Touch target issues
  const touchFails = results.filter((r) => r.touchTargetIssues.fails.length > 0);
  const touchWarns = results.filter((r) => r.touchTargetIssues.warnings.length > 0);
  if (touchFails.length > 0) {
    lines.push('  TOUCH TARGET FAILS (<36px height):');
    for (const r of touchFails) {
      lines.push(`    ${r.auth ? '[AUTH] ' : ''}${r.route} [${r.viewport}]`);
      for (const t of r.touchTargetIssues.fails) {
        lines.push(`      FAIL: ${t}`);
      }
    }
    lines.push('');
  }
  if (touchWarns.length > 0) {
    lines.push('  TOUCH TARGET WARNINGS (36-43px height):');
    for (const r of touchWarns) {
      lines.push(`    ${r.auth ? '[AUTH] ' : ''}${r.route} [${r.viewport}]`);
      for (const t of r.touchTargetIssues.warnings) {
        lines.push(`      WARN: ${t}`);
      }
    }
    lines.push('');
  }

  // Z-index / overlap issues
  const overlapIssues = results.filter((r) => r.overlappingFixedElements.length > 0);
  if (overlapIssues.length > 0) {
    lines.push('  Z-INDEX / FIXED ELEMENT OVERLAP ISSUES:');
    for (const r of overlapIssues) {
      lines.push(`    ${r.auth ? '[AUTH] ' : ''}${r.route} [${r.viewport}]`);
      for (const o of r.overlappingFixedElements) {
        lines.push(`      ${o}`);
      }
    }
    lines.push('');
  }

  // Font issues
  const fontIssues = results.filter((r) => !r.fontsLoaded.pass);
  if (fontIssues.length > 0) {
    lines.push('  FONT LOADING ISSUES (fallback-only rendering):');
    for (const r of fontIssues) {
      lines.push(
        `    ${r.auth ? '[AUTH] ' : ''}${r.route} [${r.viewport}] heading="${r.fontsLoaded.heading.slice(0, 60)}" body="${r.fontsLoaded.body.slice(0, 60)}"`,
      );
    }
    lines.push('');
  }

  // Missing H1
  const missingH1 = results.filter((r) => !r.hasH1);
  if (missingH1.length > 0) {
    lines.push('  MISSING H1 ELEMENT:');
    for (const r of missingH1) {
      lines.push(`    ${r.auth ? '[AUTH] ' : ''}${r.route} [${r.viewport}]`);
    }
    lines.push('');
  }

  // SEO title issues
  const badTitles = results.filter((r) => !r.title || r.title === 'Worship Room');
  if (badTitles.length > 0) {
    lines.push('  SEO TITLE ISSUES (empty or generic "Worship Room"):');
    const seen = new Set<string>();
    for (const r of badTitles) {
      const key = `${r.auth ? '[AUTH] ' : ''}${r.route}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(`    ${key} → "${r.title || '(empty)'}"`);
    }
    lines.push('');
  }

  // Dark theme issues
  const darkFails = results.filter((r) => r.darkTheme.applicable && !r.darkTheme.pass);
  if (darkFails.length > 0) {
    lines.push('  DARK THEME ISSUES (background too light):');
    for (const r of darkFails) {
      lines.push(`    ${r.auth ? '[AUTH] ' : ''}${r.route} [${r.viewport}] bg=${r.darkTheme.bgColor}`);
    }
    lines.push('');
  }

  // Broken images
  const brokenImgRoutes = results.filter((r) => r.brokenImages.length > 0);
  if (brokenImgRoutes.length > 0) {
    lines.push('  BROKEN IMAGES:');
    for (const r of brokenImgRoutes) {
      lines.push(`    ${r.auth ? '[AUTH] ' : ''}${r.route} [${r.viewport}]`);
      for (const img of r.brokenImages) {
        lines.push(`      ${img.slice(0, 120)}`);
      }
    }
    lines.push('');
  }

  // ── Section 4: Screenshots ──
  lines.push(divider);
  lines.push('  SCREENSHOTS');
  lines.push(divider);
  lines.push('');

  for (const r of results) {
    const icon = r.verdict === 'PASS' ? '[ok]' : r.verdict === 'WARN' ? '[!!]' : '[XX]';
    lines.push(`  ${icon} ${r.screenshotPath}`);
  }
  lines.push('');
  lines.push(divider);
  lines.push(`  Audit completed at ${new Date().toISOString()}`);
  lines.push(divider);

  return lines.join('\n');
}

// ─── Test ────────────────────────────────────────────────────────────────────

test.describe('Full Site Audit', () => {
  test.setTimeout(600000); // 10 minutes for the entire suite

  test('audit all public routes at all viewports', async ({ browser }) => {
    const results: RouteResult[] = [];

    // Public routes — no auth
    const publicContext = await browser.newContext();

    for (const route of publicRoutes) {
      for (const vp of viewports) {
        const result = await auditRouteWithRetry(
          publicContext,
          route,
          vp.name,
          vp.width,
          vp.height,
          false,
        );
        results.push(result);
      }
    }

    await publicContext.close();

    // Print report
    const report = generateReport(results);
    console.log(report);

    // Write report to file
    const reportPath = path.resolve('playwright-screenshots/audit/public-report.txt');
    fs.writeFileSync(reportPath, report, 'utf-8');
    console.log(`\nReport saved to: ${reportPath}`);
  });

  test('audit all protected routes at all viewports', async ({ browser }) => {
    const results: RouteResult[] = [];

    // Protected routes — with auth
    const authContext = await browser.newContext();
    await authContext.addInitScript(buildAuthInitScript());

    for (const route of protectedRoutes) {
      for (const vp of viewports) {
        const result = await auditRouteWithRetry(
          authContext,
          route,
          vp.name,
          vp.width,
          vp.height,
          true,
        );
        results.push(result);
      }
    }

    await authContext.close();

    // Print report
    const report = generateReport(results);
    console.log(report);

    // Write report to file
    const reportPath = path.resolve('playwright-screenshots/audit/protected-report.txt');
    fs.writeFileSync(reportPath, report, 'utf-8');
    console.log(`\nReport saved to: ${reportPath}`);
  });
});
