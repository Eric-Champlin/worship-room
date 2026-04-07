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
        <div
          aria-hidden="true"
          className="mx-auto max-w-xl border-t border-white/[0.08] mb-10"
        />

        {/* Content container — centered column */}
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <h2 id="song-pick-heading" className="flex flex-col items-center">
              <span
                className="text-4xl font-bold leading-[1.15] pb-1 sm:text-5xl lg:text-6xl"
                style={GRADIENT_TEXT_STYLE}
              >
                Today&apos;s
              </span>
              <span className="mt-1 text-3xl font-bold leading-[1.15] text-white sm:text-4xl sm:tracking-[0.02em] lg:text-5xl lg:tracking-normal">
                Song Pick
              </span>
            </h2>
          </div>

          {/* Player */}
          <div className="mt-8">
            {isOnline ? (
              <div className="relative">
                {!iframeLoaded && (
                  <div className="absolute inset-0 z-10" aria-busy="true">
                    <span className="sr-only">Loading</span>
                    <SkeletonBlock height={352} rounded="rounded-xl" />
                  </div>
                )}
                <iframe
                  title={`${song.title} by ${song.artist}`}
                  src={`${SPOTIFY_EMBED_BASE}/${song.trackId}?utm_source=generator&theme=0`}
                  width="100%"
                  height="352"
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

          {/* CTA */}
          {isOnline && (
            <div className="mt-6 text-center">
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
      </section>
    </GlowBackground>
  )
}
