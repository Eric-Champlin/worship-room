export interface SpotifyPlaylist {
  id: string
  name: string
  spotifyId: string
  spotifyUrl: string
  section: 'worship' | 'explore'
  displaySize: 'hero' | 'prominent' | 'standard'
  followers?: number
}

export const WORSHIP_PLAYLISTS: SpotifyPlaylist[] = [
  {
    id: 'top-christian-hits-2026',
    name: 'Top Christian Hits 2026',
    spotifyId: '5Ux99VLE8cG7W656CjR2si',
    spotifyUrl: 'https://open.spotify.com/playlist/5Ux99VLE8cG7W656CjR2si',
    section: 'worship',
    displaySize: 'hero',
    followers: 117155,
  },
  {
    id: 'top-christian-songs-2025',
    name: 'Top Christian Songs 2025',
    spotifyId: '6UCFGE9G29utaD959LeWcp',
    spotifyUrl: 'https://open.spotify.com/playlist/6UCFGE9G29utaD959LeWcp',
    section: 'worship',
    displaySize: 'prominent',
  },
  {
    id: 'top-worship-hits-2026',
    name: 'Top Worship Hits 2026',
    spotifyId: '4chwiyywlgWUkGysVlkkVC',
    spotifyUrl: 'https://open.spotify.com/playlist/4chwiyywlgWUkGysVlkkVC',
    section: 'worship',
    displaySize: 'standard',
  },
  {
    id: 'top-christian-pop-2026',
    name: 'Top Christian Pop 2026',
    spotifyId: '47xeosl4bqNSsvartwZzMv',
    spotifyUrl: 'https://open.spotify.com/playlist/47xeosl4bqNSsvartwZzMv',
    section: 'worship',
    displaySize: 'standard',
  },
]

export const EXPLORE_PLAYLISTS: SpotifyPlaylist[] = [
  {
    id: 'top-christian-indie-2026',
    name: 'Top Christian Indie 2026',
    spotifyId: '7wyQnm63MRwAdRbBdK4mAH',
    spotifyUrl: 'https://open.spotify.com/playlist/7wyQnm63MRwAdRbBdK4mAH',
    section: 'explore',
    displaySize: 'standard',
  },
  {
    id: 'top-christian-rap-2026',
    name: 'Top Christian Rap 2026',
    spotifyId: '6SUR3uQFcxhBuw37iDa06m',
    spotifyUrl: 'https://open.spotify.com/playlist/6SUR3uQFcxhBuw37iDa06m',
    section: 'explore',
    displaySize: 'standard',
  },
  {
    id: 'top-christian-afrobeats-2026',
    name: 'Top Christian Afrobeats 2026',
    spotifyId: '1P9YTdeqQjJnPY35KyyKji',
    spotifyUrl: 'https://open.spotify.com/playlist/1P9YTdeqQjJnPY35KyyKji',
    section: 'explore',
    displaySize: 'standard',
  },
  {
    id: 'top-christian-lofi-2026',
    name: 'Top Christian Lofi 2026',
    spotifyId: '6FvRhVisEFfmdpUBbS3ZFH',
    spotifyUrl: 'https://open.spotify.com/playlist/6FvRhVisEFfmdpUBbS3ZFH',
    section: 'explore',
    displaySize: 'standard',
  },
]

export const ALL_PLAYLISTS: SpotifyPlaylist[] = [
  ...WORSHIP_PLAYLISTS,
  ...EXPLORE_PLAYLISTS,
]
