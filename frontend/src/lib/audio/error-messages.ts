/**
 * BB-26 — Centralized error-to-user-string conversion for the audio player.
 *
 * All error dispatches in `AudioPlayerContext` route through
 * `audioErrorMessageFor()` so messages are audited in one place and
 * tested independently. Howler's stall-timeout string is preserved
 * end-to-end via string matching.
 */

import type { DbpError } from '@/types/bible-audio'

export const GENERIC_FAILURE =
  'Audio playback failed. Check your connection and try again.'
export const SLOW_CONNECTION =
  'Connection is slow. Try again when you have a better connection.'
export const NETWORK_PROBLEM = 'Connection problem. Check your network and try again.'
export const CHAPTER_UNAVAILABLE =
  "This chapter's audio isn't available right now."
export const RATE_LIMITED = 'Too many audio requests. Try again in a moment.'
export const NOT_CONFIGURED = 'Audio is not configured.'

function isDbpError(e: unknown): e is DbpError {
  return (
    typeof e === 'object' &&
    e !== null &&
    typeof (e as { kind?: unknown }).kind === 'string'
  )
}

export function audioErrorMessageFor(error: unknown): string {
  if (isDbpError(error)) {
    switch (error.kind) {
      case 'network':
        return NETWORK_PROBLEM
      case 'http':
        if (error.status === 404) return CHAPTER_UNAVAILABLE
        if (error.status === 429) return RATE_LIMITED
        return GENERIC_FAILURE
      case 'timeout':
        return SLOW_CONNECTION
      case 'parse':
        return GENERIC_FAILURE
      case 'missing-key':
        return NOT_CONFIGURED
    }
  }
  // Howler onloaderror / onplayerror pass a string through
  if (typeof error === 'string' && error.toLowerCase().includes('slow')) {
    return SLOW_CONNECTION
  }
  return GENERIC_FAILURE
}
