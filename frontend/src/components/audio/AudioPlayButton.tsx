/**
 * BB-26 — AudioPlayButton
 *
 * Lives inside the BibleReader's `ReaderChrome` right-edge icon cluster.
 * Only renders when:
 *   1. The FCBH API key is configured
 *   2. The DBP lookup for this chapter succeeded
 *
 * Otherwise returns null (no loading state, no error toast — silent
 * fallback per spec requirement #60).
 *
 * Icon reflects player state:
 *   idle / paused-on-other-chapter → Play icon, aria "Play audio for <book> <chapter>"
 *   playing this chapter            → Pause icon, aria "Pause audio"
 *   paused this chapter             → Play icon, aria "Resume audio"
 */

import { useEffect, useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAudioPlayer } from '@/hooks/audio/useAudioPlayer'
import { getChapterAudio } from '@/lib/audio/dbp-client'
import {
  getCachedChapterAudio,
  loadAudioBibles,
  setCachedChapterAudio,
} from '@/lib/audio/audio-cache'
import {
  resolveFcbhBookCode,
  resolveFcbhFilesetForBook,
} from '@/lib/audio/book-codes'
import { getFcbhReadiness } from '@/services/fcbh-readiness'
import type { AudioPlayerState } from '@/types/bible-audio'

// Near-copy of ReaderChrome's ICON_BTN with added focus-visible ring. Keep in sync if the base style changes.
const ICON_BTN =
  'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50'

interface AudioPlayButtonProps {
  bookSlug: string
  bookDisplayName: string
  chapter: number
}

export function AudioPlayButton({
  bookSlug,
  bookDisplayName,
  chapter,
}: AudioPlayButtonProps) {
  const { state, actions } = useAudioPlayer()
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [filesetId, setFilesetId] = useState<string | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Track sheetState + track across renders so we can detect the
  // "open → closed" transition and know which chapter the closed sheet was
  // playing. Needed to restore focus to the originating button without
  // letting a different chapter's button (e.g. after chapter navigation)
  // steal focus.
  const prevSheetStateRef = useRef<AudioPlayerState['sheetState']>('closed')
  const prevTrackRef = useRef<AudioPlayerState['track']>(null)

  useEffect(() => {
    const prevSheetState = prevSheetStateRef.current
    const currSheetState = state.sheetState
    const prevTrack = prevTrackRef.current
    prevSheetStateRef.current = currSheetState
    prevTrackRef.current = state.track

    const wasOpen =
      prevSheetState === 'expanded' || prevSheetState === 'minimized'
    const nowClosed = currSheetState === 'closed'
    // Only restore focus if the sheet that just closed was playing MY
    // chapter. After CLOSE, state.track is null, so we key off the
    // previous track captured in the ref.
    const wasMyTrack =
      !!prevTrack &&
      prevTrack.book === bookSlug &&
      prevTrack.chapter === chapter

    if (wasOpen && nowClosed && wasMyTrack) {
      // Defer one frame so React has finished unmounting the sheet.
      requestAnimationFrame(() => {
        buttonRef.current?.focus()
      })
    }
  }, [state.sheetState, state.track, bookSlug, chapter])

  // Spec 4 (ai-proxy-fcbh): async backend readiness probe replaces the
  // synchronous isFcbhApiKeyConfigured() env check. One probe per session,
  // cached in fcbh-readiness.ts. While probing (fcbhReady === null), the
  // audio-URL-loading effect below short-circuits on `fcbhReady !== true`
  // so the button stays hidden — same UX as when the key is unconfigured.
  const [fcbhReady, setFcbhReady] = useState<boolean | null>(null)
  useEffect(() => {
    let cancelled = false
    getFcbhReadiness().then((ready) => {
      if (!cancelled) setFcbhReady(ready)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    // `!== true` handles both null (still probing) and false (not configured)
    // identically — both render no button, matching existing UX.
    if (fcbhReady !== true) {
      setAudioUrl(null)
      setFilesetId(null)
      return
    }
    const bookCode = resolveFcbhBookCode(bookSlug)
    const fileset = resolveFcbhFilesetForBook(bookSlug)
    if (!bookCode || !fileset) {
      setAudioUrl(null)
      setFilesetId(null)
      return
    }
    // Check the in-memory cache first — if we already resolved this
    // chapter during the session, no need to refetch.
    const cached = getCachedChapterAudio(fileset, bookCode, chapter)
    if (cached) {
      setFilesetId(fileset)
      setAudioUrl(cached.url)
      return
    }

    ;(async () => {
      try {
        // Warm-up: ensures the bibles list cache is populated and the
        // FCBH key is functional. Failure bubbles up and hides the button.
        await loadAudioBibles()
        const audio = await getChapterAudio(fileset, bookCode, chapter)
        if (cancelled) return
        setCachedChapterAudio(fileset, bookCode, chapter, audio)
        setFilesetId(fileset)
        setAudioUrl(audio.url)
      } catch (e) {
        // Silent fallback per spec requirement #60
        if (!cancelled) {
          console.warn('[BB-26] DBP lookup failed:', e)
          setAudioUrl(null)
          setFilesetId(null)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [bookSlug, chapter, fcbhReady])

  // Hidden when audio unavailable (spec #26: fully removed from DOM)
  if (!audioUrl || !filesetId) return null

  const isCurrentTrack =
    state.track?.book === bookSlug && state.track?.chapter === chapter
  const isPlaying = isCurrentTrack && state.playbackState === 'playing'
  const isPaused = isCurrentTrack && state.playbackState === 'paused'

  const Icon = isPlaying ? Pause : Play
  const label = isPlaying
    ? 'Pause audio'
    : isPaused
    ? 'Resume audio'
    : `Play audio for ${bookDisplayName} ${chapter}`

  const handleClick = () => {
    if (isPlaying) {
      actions.pause()
      return
    }
    if (isPaused) {
      actions.toggle()
      return
    }
    void actions.play({
      filesetId,
      book: bookSlug,
      bookDisplayName,
      chapter,
      translation: 'World English Bible',
      url: audioUrl,
    })
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      className={cn(ICON_BTN)}
      aria-label={label}
      onClick={handleClick}
      data-testid="audio-play-button"
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  )
}
