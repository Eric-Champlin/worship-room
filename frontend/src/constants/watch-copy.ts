/**
 * Spec 6.4 — 3am Watch canonical copy.
 *
 * All Watch-related user-facing strings live here. Eric pre-approved every
 * string in this file per Gate-G-COPY (HARD). NO variation between this file
 * and the spec's Copy Deck without re-approval. NO 2-word execute-time edits.
 *
 * See _specs/forums/spec-6-4.md § "Copy Deck" for the authoritative source.
 */

export const WATCH_CRISIS_BANNER_COPY = {
  heading: "You're not alone",
  body:
    'If you’re going through something heavy right now, support is ' +
    'available. The 988 Suicide and Crisis Lifeline is free, confidential, ' +
    'and open 24/7.',
  phoneLinkText: 'Call or text 988',
  phoneLinkAriaLabel: 'Call 988 Suicide and Crisis Lifeline',
  chatLinkText: 'Chat with 988 online',
  chatLinkAriaLabel: 'Open 988 Lifeline chat in new tab',
} as const

export const WATCH_OPT_IN_MODAL_COPY = {
  header: 'Turn on 3am Watch?',
  body:
    'You’ll see mental-health and crisis-flagged posts prioritized in ' +
    'the feed during late-night hours (11pm – 5am), with crisis ' +
    'resources always visible at the top. Watch is opt-in and won’t ' +
    'change your feed during the day.',
  primaryActionLabel: 'Yes, turn on',
  secondaryActionLabel: 'Not right now',
} as const

export const WATCH_SETTINGS_COPY = {
  sectionHeading: 'Sensitive features',
  sectionHelper:
    'These features are designed for sensitive content. They’re opt-in ' +
    'and can be turned off at any time.',
  toggleLabel: '3am Watch',
  toggleDescription:
    'During night hours, the Prayer Wall leads with mental-health and ' +
    'crisis-flagged posts. A crisis-resources banner stays visible at the ' +
    'top. (11pm – 5am local time)',
  options: [
    {
      value: 'off',
      label: 'Off',
      description: 'Watch never activates.',
    },
    {
      value: 'auto',
      label: 'Auto',
      description: 'Watch activates when Night Mode is also on.',
    },
    {
      value: 'on',
      label: 'Always during late hours',
      description: 'Watch activates every night between 11pm and 5am.',
    },
  ],
} as const

export const WATCH_INDICATOR_COPY = {
  chipText: 'Watch is on',
  chipAriaLabel: '3am Watch is on',
} as const

export const WATCH_COMPOSER_PLACEHOLDER =
  'Simple presence matters. You don’t need to fix it.' as const
