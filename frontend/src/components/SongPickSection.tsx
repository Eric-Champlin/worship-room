import { useState } from 'react'

import { getSongOfTheDay } from '@/mocks/daily-experience-mock-data'
import { SPOTIFY_EMBED_BASE, SPOTIFY_PLAYLIST_URL } from '@/constants/daily-experience'
import { GlowBackground } from '@/components/homepage/GlowBackground'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { SkeletonBlock } from '@/components/skeletons/SkeletonBlock'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/utils'
import { OfflineMessage } from '@/components/pwa/OfflineMessage'

export function SongPickSection() {
  const { isOnline } = useOnlineStatus()
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const today = new Date().getDate()
  const song = getSongOfTheDay(today)

  return (
    <GlowBackground variant="left" glowOpacity={0.30} className="!bg-transparent">
      <section aria-labelledby="song-pick-heading" className="px-4 py-12 sm:px-6 sm:py-16">
        {/* Section divider */}
        <div className="mx-auto max-w-xl border-t border-white/[0.08]" />

        {/* Content container — side-by-side at md */}
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 pt-8 md:flex-row md:items-start md:gap-12">

          {/* Left: Heading + button */}
          <div className="flex shrink-0 flex-col items-center md:items-start md:pt-4">
            <h2 id="song-pick-heading" className="text-center md:text-left">
              <span
                className="block text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl"
                style={GRADIENT_TEXT_STYLE}
              >
                Today&apos;s
              </span>
              <span className="mt-1 block text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
                Song Pick
              </span>
            </h2>

            {/* Follow button + follower count — below heading */}
            {isOnline && (
              <div className="mt-6 text-center md:text-left">
                <a
                  href={SPOTIFY_PLAYLIST_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-gray-100"
                >
                  Follow Our Playlist
                </a>
                <p className="mt-2 text-xs text-white/70">Join 117K+ other followers!</p>
              </div>
            )}
          </div>

          {/* Right: Spotify player or offline message */}
          <div className="w-full max-w-xl flex-1">
            {isOnline ? (
              <div className="relative">
                {!iframeLoaded && (
                  <div className="absolute inset-0 z-10" aria-busy="true">
                    <span className="sr-only">Loading</span>
                    <SkeletonBlock height={152} rounded="rounded-xl" />
                  </div>
                )}
                <iframe
                  title={`${song.title} by ${song.artist}`}
                  src={`${SPOTIFY_EMBED_BASE}/${song.trackId}?utm_source=generator&theme=0`}
                  width="100%"
                  height="152"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className={cn('rounded-xl', !iframeLoaded && 'invisible')}
                  onLoad={() => setIframeLoaded(true)}
                />
              </div>
            ) : (
              <OfflineMessage variant="dark" message="Spotify playlists available when online" />
            )}
          </div>
        </div>
      </section>
    </GlowBackground>
  )
}
