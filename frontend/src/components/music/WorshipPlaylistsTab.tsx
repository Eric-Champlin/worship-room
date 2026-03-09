import { EXPLORE_PLAYLISTS, WORSHIP_PLAYLISTS } from '@/data/music/playlists'
import { useSpotifyAutoPause } from '@/hooks/useSpotifyAutoPause'
import { SpotifyEmbed } from './SpotifyEmbed'

export function WorshipPlaylistsTab() {
  const { spotifyDetected, manualPauseEnabled, setManualPauseEnabled, handleManualPause } =
    useSpotifyAutoPause()

  const hero = WORSHIP_PLAYLISTS.find((p) => p.displaySize === 'hero')
  const prominent = WORSHIP_PLAYLISTS.find(
    (p) => p.displaySize === 'prominent',
  )
  const standard = WORSHIP_PLAYLISTS.filter(
    (p) => p.displaySize === 'standard',
  )

  const lofiPlaylist = EXPLORE_PLAYLISTS.find((p) => p.id.includes('lofi'))

  if (!hero || !prominent) {
    if (import.meta.env.DEV) {
      throw new Error('WorshipPlaylistsTab: hero or prominent playlist not found in WORSHIP_PLAYLISTS')
    }
    return null
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Manual pause toggle when Spotify postMessage detection fails */}
      {!spotifyDetected && (
        <label
          htmlFor="manual-pause-toggle"
          className="mb-4 flex items-center gap-2 text-sm text-text-light"
        >
          <input
            id="manual-pause-toggle"
            type="checkbox"
            checked={manualPauseEnabled}
            onChange={(e) => setManualPauseEnabled(e.target.checked)}
          />
          Pause ambient while playing playlists
        </label>
      )}

      {/* Worship & Praise */}
      <h2 className="mb-6 text-lg font-semibold text-text-dark">
        Worship &amp; Praise
      </h2>

      {/* Hero embed */}
      <div className="mx-auto w-full lg:w-[70%]">
        <SpotifyEmbed playlist={hero} height={500} />
        <p className="mt-2 text-center text-sm text-text-light">
          117,000+ followers
        </p>
        {!spotifyDetected && manualPauseEnabled && (
          <button
            type="button"
            onClick={handleManualPause}
            className="mt-1 block w-full text-center text-xs text-text-light underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Pause ambient sounds
          </button>
        )}
      </div>

      {/* Prominent embed */}
      <div className="mx-auto mt-6 w-full lg:w-[60%]">
        <SpotifyEmbed playlist={prominent} />
        {!spotifyDetected && manualPauseEnabled && (
          <button
            type="button"
            onClick={handleManualPause}
            className="mt-1 block w-full text-center text-xs text-text-light underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Pause ambient sounds
          </button>
        )}
      </div>

      {/* Standard embeds */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {standard.map((playlist) => (
          <div key={playlist.id}>
            <SpotifyEmbed playlist={playlist} />
            {!spotifyDetected && manualPauseEnabled && (
              <button
                type="button"
                onClick={handleManualPause}
                className="mt-1 block w-full text-center text-xs text-text-light underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Pause ambient sounds
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Explore */}
      <h2 className="mb-6 mt-10 text-lg font-semibold text-text-dark">
        Explore
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {EXPLORE_PLAYLISTS.map((playlist) => (
          <div
            key={playlist.id}
            id={playlist.id === lofiPlaylist?.id ? 'lofi-embed' : undefined}
          >
            <SpotifyEmbed playlist={playlist} />
            {!spotifyDetected && manualPauseEnabled && (
              <button
                type="button"
                onClick={handleManualPause}
                className="mt-1 block w-full text-center text-xs text-text-light underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Pause ambient sounds
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
