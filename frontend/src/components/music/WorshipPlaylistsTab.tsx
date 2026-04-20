import { Info } from 'lucide-react'
import { EXPLORE_PLAYLISTS, WORSHIP_PLAYLISTS } from '@/data/music/playlists'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SpotifyEmbed } from './SpotifyEmbed'

// Removed in visual polish — keeping for potential re-enable
// import { useSpotifyAutoPause } from '@/hooks/useSpotifyAutoPause'

const PREVIEW_DISCLAIMER =
  '30-second previews play here. Tap any track or playlist to open in Spotify for full listening.'

function PreviewDisclaimer() {
  return (
    <p className="mx-auto mb-3 flex max-w-2xl items-center justify-center gap-2 text-xs text-white/50">
      <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{PREVIEW_DISCLAIMER}</span>
    </p>
  )
}

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
      <SectionHeader>Featured</SectionHeader>
      <PreviewDisclaimer />

      {/* Hero embed */}
      <div className="mx-auto w-full lg:w-[70%]">
        <SpotifyEmbed playlist={hero} height={500} />
      </div>

      {/* Explore */}
      <div className="mt-12">
        <SectionHeader>Explore</SectionHeader>
        <PreviewDisclaimer />

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
