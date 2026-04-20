import { useEffect, useRef, useState } from 'react'
import { WifiOff } from 'lucide-react'

import type { SpotifyPlaylist } from '@/data/music/playlists'
import { SkeletonBlock } from '@/components/skeletons/SkeletonBlock'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/utils'

const EMBED_LOAD_TIMEOUT_MS = 10_000

interface SpotifyEmbedProps {
  playlist: SpotifyPlaylist
  height?: number
  className?: string
}

export function SpotifyEmbed({
  playlist,
  height = 352,
  className,
}: SpotifyEmbedProps) {
  const { isOnline } = useOnlineStatus()
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(
    'loading'
  )
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (status === 'loading') {
      timeoutRef.current = setTimeout(() => {
        setStatus((prev) => (prev === 'loading' ? 'error' : prev))
      }, EMBED_LOAD_TIMEOUT_MS)
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [status])

  if (!isOnline) {
    return (
      <div
        className={cn(
          'rounded-xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-6 text-center',
          'shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]',
          className,
        )}
      >
        <WifiOff className="mx-auto h-6 w-6 text-white/40" aria-hidden="true" />
        <p className="mt-2 text-sm text-white/60">
          Spotify playlists available when online
        </p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div
        className={cn(
          'rounded-xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-6 text-center',
          'shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]',
          className,
        )}
      >
        <p className="font-medium text-white">{playlist.name}</p>
        <p className="mt-1 text-sm text-white/60">
          Player couldn&apos;t load. Tap below for full listening in the Spotify app.
        </p>
        <a
          href={playlist.spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] transition-colors motion-reduce:transition-none"
        >
          Open in Spotify →
        </a>
      </div>
    )
  }

  return (
    <div className="relative">
      {status === 'loading' && (
        <div className="absolute inset-0 z-10" aria-busy="true">
          <span className="sr-only">Loading</span>
          <SkeletonBlock height={height} rounded="rounded-xl" />
        </div>
      )}
      <iframe
        src={`https://open.spotify.com/embed/playlist/${playlist.spotifyId}`}
        width="100%"
        height={height}
        frameBorder="0"
        allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title={`${playlist.name} Spotify playlist`}
        className={cn('rounded-xl', status === 'loading' && 'invisible', className)}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
    </div>
  )
}
