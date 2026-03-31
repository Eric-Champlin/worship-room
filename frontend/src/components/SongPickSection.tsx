import { useState } from 'react'
import { Music } from 'lucide-react'

import { getSongOfTheDay } from '@/mocks/daily-experience-mock-data'
import { SPOTIFY_EMBED_BASE, SPOTIFY_PLAYLIST_URL } from '@/constants/daily-experience'
import { HeadingDivider } from '@/components/HeadingDivider'
import { SkeletonBlock } from '@/components/skeletons/SkeletonBlock'
import { useElementWidth } from '@/hooks/useElementWidth'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/utils'
import { OfflineMessage } from '@/components/pwa/OfflineMessage'

export function SongPickSection() {
  const { isOnline } = useOnlineStatus()
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const today = new Date().getDate()
  const song = getSongOfTheDay(today)

  const { ref: headingRef, width: headingWidth } = useElementWidth<HTMLHeadingElement>()

  return (
    <section
      aria-labelledby="song-pick-heading"
      className="px-4 py-12 sm:px-6 sm:py-16"
    >
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 text-center backdrop-blur-sm sm:p-8">
          <h2
            ref={headingRef}
            id="song-pick-heading"
            className="inline-flex items-center justify-center gap-2 font-script text-[2.7rem] font-bold text-white sm:text-[3.4rem] lg:text-[4rem]"
          >
            <Music className="h-7 w-7 text-white/40 sm:h-8 sm:w-8" aria-hidden="true" />
            Today&apos;s Song Pick
          </h2>
          <div className="mt-2 flex justify-center">
            <HeadingDivider width={headingWidth} />
          </div>
          {isOnline ? (
            <>
              <div className="relative mt-6">
                {!iframeLoaded && (
                  <div className="absolute inset-0 z-10" aria-busy="true">
                    <span className="sr-only">Loading</span>
                    <SkeletonBlock height={280} rounded="rounded-xl" />
                  </div>
                )}
                <iframe
                  title={`${song.title} by ${song.artist}`}
                  src={`${SPOTIFY_EMBED_BASE}/${song.trackId}?utm_source=generator&theme=0`}
                  width="100%"
                  height="280"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className={cn('rounded-xl', !iframeLoaded && 'invisible')}
                  onLoad={() => setIframeLoaded(true)}
                />
              </div>
              <div className="-mt-1">
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
            </>
          ) : (
            <div className="mt-6">
              <OfflineMessage variant="dark" message="Spotify playlists available when online" />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
