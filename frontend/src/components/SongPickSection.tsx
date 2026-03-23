import { getSongOfTheDay } from '@/mocks/daily-experience-mock-data'
import { SPOTIFY_EMBED_BASE, SPOTIFY_PLAYLIST_URL } from '@/constants/daily-experience'
import { HeadingDivider } from '@/components/HeadingDivider'
import { useElementWidth } from '@/hooks/useElementWidth'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { OfflineMessage } from '@/components/pwa/OfflineMessage'

export function SongPickSection() {
  const { isOnline } = useOnlineStatus()
  const today = new Date().getDate()
  const song = getSongOfTheDay(today)

  const { ref: headingRef, width: headingWidth } = useElementWidth<HTMLHeadingElement>()

  return (
    <section
      aria-labelledby="song-pick-heading"
      className="bg-hero-dark px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20"
    >
      <div className="mx-auto max-w-5xl text-center">
        <h2
          ref={headingRef}
          id="song-pick-heading"
          className="inline-block font-script text-[2.7rem] font-bold text-white sm:text-[3.4rem] lg:text-[4rem]"
        >
          Today&apos;s Song Pick
        </h2>
        <div className="mt-2 flex justify-center">
          <HeadingDivider width={headingWidth} />
        </div>
        {isOnline ? (
          <>
            <div className="mx-auto mt-8 max-w-xl">
              <iframe
                title={`${song.title} by ${song.artist}`}
                src={`${SPOTIFY_EMBED_BASE}/${song.trackId}?utm_source=generator&theme=0`}
                width="100%"
                height="280"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="rounded-xl"
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
          <div className="mx-auto mt-8 max-w-xl">
            <OfflineMessage variant="dark" message="Spotify playlists available when online" />
          </div>
        )}
      </div>
    </section>
  )
}
