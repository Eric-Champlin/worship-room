import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SpotifyEmbed } from '@/components/music/SpotifyEmbed'

// Mock useOnlineStatus
vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => ({ isOnline: true }),
}))

const mockPlaylist = {
  id: 'test',
  name: 'Test Playlist',
  spotifyId: 'abc123',
  spotifyUrl: 'https://open.spotify.com/playlist/abc123',
  section: 'worship' as const,
  displaySize: 'standard' as const,
}

describe('SpotifyEmbed skeleton integration', () => {
  it('shows skeleton placeholder during loading', () => {
    const { container } = render(<SpotifyEmbed playlist={mockPlaylist} />)
    // Skeleton overlay should be present (aria-busy on the overlay div)
    const overlay = container.querySelector('[aria-busy="true"]')
    expect(overlay).toBeInTheDocument()
    // sr-only Loading text
    expect(screen.getByText('Loading')).toBeInTheDocument()
  })

  it('iframe is invisible during loading', () => {
    const { container } = render(<SpotifyEmbed playlist={mockPlaylist} />)
    const iframe = container.querySelector('iframe')
    expect(iframe).toBeInTheDocument()
    expect(iframe!.className).toContain('invisible')
  })

  it('hides skeleton after iframe onLoad', () => {
    const { container } = render(<SpotifyEmbed playlist={mockPlaylist} />)
    const iframe = container.querySelector('iframe')!
    fireEvent.load(iframe)

    // Skeleton overlay should be gone
    const overlay = container.querySelector('[aria-busy="true"]')
    expect(overlay).not.toBeInTheDocument()
    // iframe should be visible
    expect(iframe.className).not.toContain('invisible')
  })
})

describe('Index re-exports', () => {
  it('exports all skeleton components from index', async () => {
    const exports = await import('../index')
    const expectedExports = [
      'SkeletonBlock',
      'SkeletonText',
      'SkeletonCircle',
      'SkeletonCard',
      'DashboardSkeleton',
      'DailyHubSkeleton',
      'PrayerWallSkeleton',
      'BibleBrowserSkeleton',
      'BibleReaderSkeleton',
      'GrowPageSkeleton',
      'InsightsSkeleton',
      'FriendsSkeleton',
      'SettingsSkeleton',
      'MyPrayersSkeleton',
      'MusicSkeleton',
      'ProfileSkeleton',
      'useLoadingState',
    ]
    expectedExports.forEach((name) => {
      expect(typeof exports[name as keyof typeof exports]).toBe('function')
    })
  })
})
