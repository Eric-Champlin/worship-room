/**
 * Spec 6.7 — Shareable Testimony Cards copy deck.
 *
 * All user-facing strings live here per Universal Rule 5. Anti-pressure
 * checklist applied: no exclamation points near vulnerability, no urgency,
 * blameless framing, sentence case + period terminators.
 */

// Affordance (inside ShareDropdown)
export const SHARE_AS_IMAGE_LABEL = 'Share as image'
export const SHARE_AS_IMAGE_ARIA_LABEL = 'Share this testimony as an image'

// One-time warning modal (master plan AC#1)
export const SHARE_WARNING_TITLE = 'Before you share'
export const SHARE_WARNING_BODY =
  'Once you share this image, it cannot be unshared. People who receive it can save it forever, even if you later delete the original testimony.'
export const SHARE_WARNING_CONFIRM = 'I understand, continue'
export const SHARE_WARNING_CANCEL = 'Cancel'

// Loading state (announced via aria-live)
export const SHARE_LOADING_TEXT = 'Preparing your image…'
export const SHARE_LOADING_ARIA = 'Preparing your image, please wait'

// Error state (toast)
export const SHARE_FAILURE_TOAST =
  "We couldn't prepare that image. Please try again."

// Long-content truncation line (rendered into the PNG)
export const TRUNCATION_LINE = '… Read the full testimony on Worship Room'

// PNG file (no userId, no timestamp — master plan AC#3)
export const PNG_FILENAME = 'worship-room-testimony.png'

// Anonymous attribution (verbatim — matches PrayerCard mapper output)
export const ANONYMOUS_LABEL = 'Anonymous'
