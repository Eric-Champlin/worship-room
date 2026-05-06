import { EXPLORE_PLAYLISTS, WORSHIP_PLAYLISTS } from '@/data/music/playlists'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SpotifyEmbed } from './SpotifyEmbed'

const PREVIEW_DISCLAIMER =
  "Previews play here unless you're logged into a Spotify Premium account."

export function WorshipPlaylistsTab() {
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
      <SectionHeader variant="gradient">Featured</SectionHeader>

      {/* Hero embed */}
      <div className="mx-auto w-full lg:w-[70%]">
        <SpotifyEmbed playlist={hero} height={500} />
      </div>

      <p className="mx-auto mt-3 max-w-2xl text-center text-xs text-white/60">
        {PREVIEW_DISCLAIMER}
      </p>

      {/* Explore */}
      <div className="mt-12">
        <SectionHeader variant="gradient">Explore</SectionHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {explorePlaylists.map((playlist) => (
            <div key={playlist.id}>
              <SpotifyEmbed playlist={playlist} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
