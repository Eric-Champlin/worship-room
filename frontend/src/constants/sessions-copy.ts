/**
 * Spec 1.5g — all user-facing strings for /settings/sessions and its modals.
 *
 * Centralized for i18n-readiness and anti-pressure copy review. Every string
 * passes the 6-point anti-pressure checklist (no comparison, no urgency, no
 * exclamation points near vulnerability, no jargon, no streak-shame, no false
 * scarcity).
 */
export const SESSIONS_COPY = {
  pageTitle: 'Active sessions',
  pageSubtitle: "Where you're signed in",
  signOutOthers: 'Sign out other devices',
  signOutEverywhere: 'Sign out everywhere',
  signOutThis: 'Sign out',
  thisDevice: 'This device',
  unknownLocation: 'Unknown location',
  unknownDevice: 'Unknown device',
  emptyState: "You're only signed in on this device.",
  loadError: "Couldn't load sessions — try again.",
  revokeError: "Couldn't sign out that session — try again.",
  signedOutToast: 'Other devices signed out.',
  signedOutEverywhereFlash: "You've been signed out everywhere.",
  confirmEverywhereTitle: 'Sign out everywhere?',
  confirmEverywhereBody: 'This signs you out on all devices including this one.',
  confirmEverywhereAction: 'Sign out everywhere',
  confirmEverywhereCancel: 'Cancel',
  ariaSessionRow: 'Session details',
} as const
