import { EXPLORE_PLAYLISTS, WORSHIP_PLAYLISTS } from '@/data/music/playlists'
import { HeadingDivider } from '@/components/HeadingDivider'
import { useElementWidth } from '@/hooks/useElementWidth'
import { SpotifyEmbed } from './SpotifyEmbed'

// Removed in visual polish — keeping for potential re-enable
// import { useSpotifyAutoPause } from '@/hooks/useSpotifyAutoPause'

export function WorshipPlaylistsTab() {
  const { ref: featuredRef, width: featuredWidth } = useElementWidth<HTMLDivElement>()
  const { ref: exploreRef, width: exploreWidth } = useElementWidth<HTMLDivElement>()

  const hero = WORSHIP_PLAYLISTS.find((p) => p.displaySize === 'hero')

  // Explore = all non-hero worship playlists + all explore playlists except lofi
  const explorePlaylists = [
    ...WORSHIP_PLAYLISTS.filter((p) => p.displaySize !== 'hero'),
    ...EXPLORE_PLAYLISTS.filter((p) => !p.id.includes('lofi')),
  ]

  if (!hero) {
    if (import.meta.env.DEV) {
      throw new Error('WorshipPlaylistsTab: hero playlist not found in WORSHIP_PLAYLISTS')
    }
    return null
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Featured */}
      <div className="mb-8 text-center" ref={featuredRef}>
        <h2 className="font-script text-3xl font-bold text-text-dark sm:text-4xl">
          Featured
        </h2>
        <HeadingDivider width={featuredWidth} />
      </div>

      {/* Hero embed */}
      <div className="mx-auto w-full lg:w-[70%]">
        <SpotifyEmbed playlist={hero} height={500} />
      </div>

      {/* Explore */}
      <div className="mb-8 mt-12 text-center" ref={exploreRef}>
        <h2 className="font-script text-3xl font-bold text-text-dark sm:text-4xl">
          Explore
        </h2>
        <HeadingDivider width={exploreWidth} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {explorePlaylists.map((playlist) => (
          <div key={playlist.id}>
            <SpotifyEmbed playlist={playlist} />
          </div>
        ))}
      </div>
    </div>
  )
}
