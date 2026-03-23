import { useEffect, useRef, useState } from 'react'
import { WifiOff } from 'lucide-react'

import type { SpotifyPlaylist } from '@/data/music/playlists'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/utils'

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
      }, 10000)
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [status])

  if (!isOnline) {
    return (
      <div
        className={cn('rounded-xl border border-white/10 bg-[rgba(15,10,30,0.3)] p-6 text-center', className)}
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
        className={cn('rounded-xl border border-white/10 bg-[rgba(15,10,30,0.3)] p-6 text-center', className)}
      >
        <p className="font-medium text-white">{playlist.name}</p>
        <p className="mt-1 text-sm text-white/60">
          Player couldn&apos;t load — tap to open in Spotify
        </p>
        <a
          href={playlist.spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block rounded-full border border-primary px-5 py-2 text-sm font-medium text-primary"
        >
          Open in Spotify
        </a>
      </div>
    )
  }

  return (
    <iframe
      src={`https://open.spotify.com/embed/playlist/${playlist.spotifyId}`}
      width="100%"
      height={height}
      frameBorder="0"
      allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
      title={`${playlist.name} Spotify playlist`}
      className={cn('rounded-xl', className)}
      onLoad={() => setStatus('loaded')}
      onError={() => setStatus('error')}
    />
  )
}
