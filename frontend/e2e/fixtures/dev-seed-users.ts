/**
 * Dev-seed user constants for E2E tests.
 *
 * Dev-seed password 'WorshipRoomDev2026!' is public — it's stored in plaintext
 * (as a BCrypt strength 10 hash) in
 * backend/src/main/resources/db/changelog/contexts/dev-seed.xml (context='dev',
 * never loaded in prod). Hardcoding it here is intentional.
 */
export const DEV_SEED_EMAIL = 'sarah@worshiproom.dev'
export const DEV_SEED_PASSWORD = 'WorshipRoomDev2026!' // Public — see file header.

/** Generate a unique test email — used by tests that register fresh users. */
export function freshTestEmail(): string {
  return `playwright-test+${Date.now()}@worshiproom.dev`
}
