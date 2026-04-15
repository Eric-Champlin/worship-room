/**
 * BB-26 — Howler-backed audio engine.
 *
 * Thin wrapper around Howler.js that lazy-loads the library on first
 * play. Howler does NOT appear in the main bundle — the dynamic import
 * inside `getHowlCtor` creates a separate Rollup chunk on demand.
 *
 * The engine exposes a typed API that hides Howler's raw surface. BB-27
 * (ambient layering) and BB-29 (continuous playback) will extend this
 * module; BB-26 ships only what it needs.
 *
 * CORS taint + BB-27 dependency:
 *   Howler 2.2.x has no direct `crossOrigin` option for its internal HTML5
 *   <audio> element. BB-27 will wrap that element in a
 *   MediaElementAudioSourceNode for ducking; that path silently produces no
 *   sound if the element is CORS-tainted. We set `crossOrigin='anonymous'`
 *   on the element synchronously after construction, before any network
 *   load resolves. Load-bearing for BB-27 — DO NOT remove as "unused."
 *
 * Stall timeout:
 *   Howler emits loaderror on hard failures but has no "buffering took too
 *   long" detection. The engine arms a 10-second timer when Howler begins
 *   loading; if no terminal event fires first, dispatches onLoadError with
 *   the canonical stall message. Cleared on play/load/destroy.
 */

import type { Howl as HowlType } from 'howler'

export type EngineEvents = {
  onPlay?: () => void
  onPause?: () => void
  onEnd?: () => void
  onLoad?: (durationSeconds: number) => void
  onLoadError?: (message: string) => void
  onPlayError?: (message: string) => void
}

export interface AudioEngineInstance {
  play(): void
  pause(): void
  stop(): void
  seek(seconds: number): void
  getCurrentTime(): number
  getDuration(): number
  setRate(rate: number): void
  setVolume(volume: number): void
  destroy(): void
}

const STALL_TIMEOUT_MS = 10_000
export const STALL_ERROR_MESSAGE =
  'Connection is slow. Try again when you have a better connection.'

let cachedHowlCtor: typeof HowlType | null = null

async function getHowlCtor(): Promise<typeof HowlType> {
  if (cachedHowlCtor) return cachedHowlCtor
  const mod = await import('howler')
  cachedHowlCtor = mod.Howl
  return cachedHowlCtor
}

/** Test-only: reset the cached Howl constructor so each test gets a fresh mock. */
export function __resetHowlCtorForTests(): void {
  cachedHowlCtor = null
}

export async function createEngineInstance(
  url: string,
  events: EngineEvents,
): Promise<AudioEngineInstance> {
  const Howl = await getHowlCtor()

  let stallTimer: ReturnType<typeof setTimeout> | null = null
  const clearStallTimer = () => {
    if (stallTimer) {
      clearTimeout(stallTimer)
      stallTimer = null
    }
  }
  const armStallTimer = () => {
    clearStallTimer()
    stallTimer = setTimeout(() => {
      events.onLoadError?.(STALL_ERROR_MESSAGE)
    }, STALL_TIMEOUT_MS)
  }

  const howl = new Howl({
    src: [url],
    // HTML5 mode streams the audio rather than decoding it into memory.
    // Critical for 3-5 minute Bible chapters on mobile — Web Audio mode
    // would decode several MB per chapter into memory AND take a different
    // CORS taint path that would break BB-27's ducking plan.
    html5: true,
    // Explicit format hint — FCBH CloudFront serves audio with
    // Content-Type: binary/octet-stream (verified in Step 17 recon).
    // Telling Howler the format explicitly skips MIME sniffing and removes
    // any future ambiguity if CDN headers or browser sniffers change.
    format: ['mp3'],
    preload: true,
    xhr: { withCredentials: false },
    onload: () => {
      clearStallTimer()
      events.onLoad?.(howl.duration())
    },
    onloaderror: (_id, err) => {
      clearStallTimer()
      events.onLoadError?.(String(err))
    },
    onplayerror: (_id, err) => {
      clearStallTimer()
      events.onPlayError?.(String(err))
    },
    onplay: () => {
      clearStallTimer()
      events.onPlay?.()
    },
    onpause: () => {
      events.onPause?.()
    },
    onend: () => {
      events.onEnd?.()
    },
  })

  // CORS taint mitigation — set crossOrigin on the underlying <audio> element
  // synchronously after construction, before the network fetch resolves.
  // Howler 2.2.x private-field access: _sounds[0]._node. Version-dependent.
  // DO NOT remove — load-bearing for BB-27 ducking. See file header.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sounds = (howl as any)._sounds as
      | Array<{ _node?: HTMLAudioElement }>
      | undefined
    const node = sounds?.[0]?._node
    if (node instanceof HTMLAudioElement) {
      node.crossOrigin = 'anonymous'
    } else if (!sounds || sounds.length === 0) {
      // Howler internal shape changed — log for BB-27 to pick up.
      console.warn(
        '[BB-26] Unable to set crossOrigin on Howler audio element; BB-27 ducking may be affected.',
      )
    } else {
      // sounds exists and is populated, but _node is not an HTMLAudioElement.
      // Likely a Howler version change exposing a different element type.
      // Diagnostic breadcrumb for BB-27 debugging — the CORS mitigation did
      // not run, and the ducking path will silently produce no sound.
      console.warn(
        '[BB-26] Howler _sounds[0]._node is not HTMLAudioElement; BB-27 ducking may be affected.',
      )
    }
  } catch {
    console.warn(
      '[BB-26] Unable to set crossOrigin on Howler audio element; BB-27 ducking may be affected.',
    )
  }

  // Arm the stall timer now — Howler has started loading.
  armStallTimer()

  return {
    play: () => {
      howl.play()
    },
    pause: () => {
      howl.pause()
    },
    stop: () => {
      clearStallTimer()
      howl.stop()
    },
    seek: (s: number) => {
      howl.seek(s)
    },
    getCurrentTime: () => {
      const v = howl.seek()
      return typeof v === 'number' ? v : 0
    },
    getDuration: () => howl.duration(),
    setRate: (r: number) => {
      howl.rate(r)
    },
    setVolume: (v: number) => {
      howl.volume(Math.max(0, Math.min(1, v)))
    },
    destroy: () => {
      clearStallTimer()
      howl.unload()
    },
  }
}
