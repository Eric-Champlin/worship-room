/**
 * BB-26 — useAudioPlayer hook
 *
 * Canonical consumer interface for the AudioPlayerContext. Components
 * import this hook, destructure `{ state, actions }` as needed, and never
 * touch the raw context.
 */

import { useContext } from 'react'
import { AudioPlayerContext } from '@/contexts/AudioPlayerContext'

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext)
  if (!ctx) {
    throw new Error('useAudioPlayer must be used inside <AudioPlayerProvider>')
  }
  return ctx
}
