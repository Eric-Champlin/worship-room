import type { Page, Route } from '@playwright/test'

/**
 * Canonical sample user summary used by mock-backend helpers.
 * Verbatim from spec-1-9-auth-flow.spec.ts (the canonical first consumer).
 */
export const SAMPLE_USER_SUMMARY = {
  id: 'uuid-e2e-sarah',
  email: 'sarah@example.com',
  displayName: 'Sarah',
  firstName: 'Sarah',
  lastName: 'Smith',
  isAdmin: false,
  timezone: 'America/Chicago',
} as const

/**
 * Canonical sample /users/me response (extends SAMPLE_USER_SUMMARY with the
 * full profile fields). Verbatim from spec-1-9-auth-flow.spec.ts.
 */
export const SAMPLE_USER_RESPONSE = {
  ...SAMPLE_USER_SUMMARY,
  displayNamePreference: 'first_only',
  customDisplayName: null,
  avatarUrl: null,
  bio: null,
  favoriteVerseReference: null,
  favoriteVerseText: null,
  isEmailVerified: true,
  joinedAt: '2026-04-01T00:00:00Z',
} as const

/** JWT-shaped dummy token (3 base64 segments) — not a real signed token. */
export const DUMMY_JWT =
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1dWlkLWUyZS1zYXJhaCJ9.dummy'

interface MockEndpointOptions {
  status?: number
  body?: unknown
  delayMs?: number
}

async function fulfillJson(
  route: Route,
  status: number,
  body: unknown,
  delayMs?: number,
) {
  if (delayMs) {
    await new Promise((r) => setTimeout(r, delayMs))
  }
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

/**
 * Mock POST /api/v1/auth/login. Default: 200 with token + user summary.
 * Override status / body / delay via opts.
 */
export async function mockAuthLogin(page: Page, opts: MockEndpointOptions = {}) {
  const status = opts.status ?? 200
  const body = opts.body ?? {
    data: { token: DUMMY_JWT, user: SAMPLE_USER_SUMMARY },
    meta: { requestId: 'e2e-r-login' },
  }
  await page.route('**/api/v1/auth/login', async (route) => {
    await fulfillJson(route, status, body, opts.delayMs)
  })
}

/**
 * Mock POST /api/v1/auth/register. Default: 200 with { registered: true }.
 */
export async function mockAuthRegister(
  page: Page,
  opts: MockEndpointOptions = {},
) {
  const status = opts.status ?? 200
  const body = opts.body ?? {
    data: { registered: true },
    meta: { requestId: 'e2e-r-reg' },
  }
  await page.route('**/api/v1/auth/register', async (route) => {
    await fulfillJson(route, status, body, opts.delayMs)
  })
}

/**
 * Mock GET /api/v1/users/me. Default: 200 with SAMPLE_USER_RESPONSE.
 */
export async function mockUsersMe(page: Page, opts: MockEndpointOptions = {}) {
  const status = opts.status ?? 200
  const body = opts.body ?? {
    data: SAMPLE_USER_RESPONSE,
    meta: { requestId: 'e2e-r-me' },
  }
  await page.route('**/api/v1/users/me', async (route) => {
    await fulfillJson(route, status, body, opts.delayMs)
  })
}

/**
 * Mock POST /api/v1/auth/logout. Always 204.
 */
export async function mockAuthLogout(page: Page) {
  await page.route('**/api/v1/auth/logout', async (route) => {
    await route.fulfill({ status: 204, body: '' })
  })
}

interface AllAuthMockOptions {
  login?: MockEndpointOptions
  register?: MockEndpointOptions
  me?: MockEndpointOptions
}

/**
 * Convenience: register all four auth-related mocks at once. Parity with
 * the previous inline mockAuthEndpoints function in spec-1-9-auth-flow.
 */
export async function mockAllAuth(page: Page, opts: AllAuthMockOptions = {}) {
  await mockAuthLogin(page, opts.login)
  await mockAuthRegister(page, opts.register)
  await mockUsersMe(page, opts.me)
  await mockAuthLogout(page)
}
