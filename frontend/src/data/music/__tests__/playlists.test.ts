import { describe, expect, it } from 'vitest'
import {
  ALL_PLAYLISTS,
  EXPLORE_PLAYLISTS,
  WORSHIP_PLAYLISTS,
} from '../playlists'

describe('Playlist Data', () => {
  it('exports correct number of playlists', () => {
    expect(ALL_PLAYLISTS).toHaveLength(8)
    expect(WORSHIP_PLAYLISTS).toHaveLength(4)
    expect(EXPLORE_PLAYLISTS).toHaveLength(4)
  })

  it('all playlists have required fields', () => {
    for (const playlist of ALL_PLAYLISTS) {
      expect(playlist.id).toBeTruthy()
      expect(playlist.name).toBeTruthy()
      expect(playlist.spotifyId).toBeTruthy()
      expect(playlist.spotifyUrl).toBeTruthy()
      expect(['worship', 'explore']).toContain(playlist.section)
      expect(['hero', 'prominent', 'standard']).toContain(playlist.displaySize)
    }
  })

  it('hero playlist has followers', () => {
    const hero = ALL_PLAYLISTS.find((p) => p.displaySize === 'hero')
    expect(hero).toBeDefined()
    expect(hero!.followers).toBeDefined()
    expect(hero!.followers).toBeGreaterThan(0)
  })

  it('spotifyUrl contains spotifyId', () => {
    for (const playlist of ALL_PLAYLISTS) {
      expect(playlist.spotifyUrl).toContain(playlist.spotifyId)
    }
  })
})
