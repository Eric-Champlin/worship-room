/**
 * BB-26 — Media Session API helper.
 *
 * Updates `navigator.mediaSession.metadata` and action handlers so the OS
 * lock screen / media controls reflect the current Bible audio track.
 *
 * All access is guarded with `'mediaSession' in navigator` so unsupported
 * browsers (older Firefox, some WebViews) degrade silently. Any exception
 * is caught + warned — never thrown.
 */

import type { AudioPlayerActions, PlayerTrack } from '@/types/bible-audio'

const ARTWORK_URL = '/icons/icon-512.png'

/**
 * BB-29 — optional next/prev track handlers. BB-26 did not wire these;
 * BB-29 wires them so lock-screen and headphone buttons can advance
 * chapters manually. `nexttrack` flows through the same `autoAdvance`
 * cascade the provider uses for natural track ends; `previoustrack`
 * resolves the prior chapter via `getAdjacentChapter` and calls play().
 */
export interface MediaSessionHandlers {
  onNextTrack?: () => void
  onPrevTrack?: () => void
}

function hasMediaSession(): boolean {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator
}

export function updateMediaSession(
  track: PlayerTrack,
  actions: AudioPlayerActions,
  handlers: MediaSessionHandlers = {},
): void {
  if (!hasMediaSession()) return
  try {
    // MediaMetadata is a browser global — not imported.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Meta = (globalThis as any).MediaMetadata
    if (typeof Meta === 'function') {
      navigator.mediaSession.metadata = new Meta({
        title: `${track.bookDisplayName} ${track.chapter}`,
        artist: track.translation,
        album: 'Worship Room',
        artwork: [{ src: ARTWORK_URL, sizes: '512x512', type: 'image/png' }],
      })
    }
    navigator.mediaSession.setActionHandler('play', () => actions.toggle())
    navigator.mediaSession.setActionHandler('pause', () => actions.pause())
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const current = details.seekOffset ?? 10
      // No direct access to currentTime here; handler is a coarse jump.
      // A future spec with more signal can improve this.
      actions.seek(Math.max(0, current * -1))
    })
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const current = details.seekOffset ?? 10
      actions.seek(current)
    })
    navigator.mediaSession.setActionHandler('stop', () => actions.stop())
    navigator.mediaSession.setActionHandler(
      'nexttrack',
      handlers.onNextTrack ?? null,
    )
    navigator.mediaSession.setActionHandler(
      'previoustrack',
      handlers.onPrevTrack ?? null,
    )
  } catch (e) {
    console.warn('[BB-26] Media Session update failed:', e)
  }
}

export function clearMediaSession(): void {
  if (!hasMediaSession()) return
  try {
    navigator.mediaSession.metadata = null
    navigator.mediaSession.setActionHandler('play', null)
    navigator.mediaSession.setActionHandler('pause', null)
    navigator.mediaSession.setActionHandler('seekbackward', null)
    navigator.mediaSession.setActionHandler('seekforward', null)
    navigator.mediaSession.setActionHandler('stop', null)
    navigator.mediaSession.setActionHandler('nexttrack', null)
    navigator.mediaSession.setActionHandler('previoustrack', null)
  } catch {
    /* noop */
  }
}
