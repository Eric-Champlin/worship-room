import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import {
  DashboardSkeleton,
  DailyHubSkeleton,
  PrayerWallSkeleton,
  BibleBrowserSkeleton,
  BibleReaderSkeleton,
  GrowPageSkeleton,
  InsightsSkeleton,
  FriendsSkeleton,
  SettingsSkeleton,
  MyPrayersSkeleton,
  MusicSkeleton,
  ProfileSkeleton,
} from '../index'

const skeletons = [
  { name: 'DashboardSkeleton', Component: DashboardSkeleton },
  { name: 'DailyHubSkeleton', Component: DailyHubSkeleton },
  { name: 'PrayerWallSkeleton', Component: PrayerWallSkeleton },
  { name: 'BibleBrowserSkeleton', Component: BibleBrowserSkeleton },
  { name: 'BibleReaderSkeleton', Component: BibleReaderSkeleton },
  { name: 'GrowPageSkeleton', Component: GrowPageSkeleton },
  { name: 'InsightsSkeleton', Component: InsightsSkeleton },
  { name: 'FriendsSkeleton', Component: FriendsSkeleton },
  { name: 'SettingsSkeleton', Component: SettingsSkeleton },
  { name: 'MyPrayersSkeleton', Component: MyPrayersSkeleton },
  { name: 'MusicSkeleton', Component: MusicSkeleton },
  { name: 'ProfileSkeleton', Component: ProfileSkeleton },
]

describe('Page Skeletons', () => {
  skeletons.forEach(({ name, Component }) => {
    describe(name, () => {
      it('renders with aria-busy="true"', () => {
        const { container } = render(<Component />)
        const root = container.firstElementChild as HTMLElement
        expect(root.getAttribute('aria-busy')).toBe('true')
      })

      it('renders sr-only "Loading" text', () => {
        render(<Component />)
        const srText = screen.getByText('Loading')
        expect(srText).toBeInTheDocument()
        expect(srText.className).toContain('sr-only')
      })

      it('renders without errors', () => {
        expect(() => render(<Component />)).not.toThrow()
      })
    })
  })

  // Specific layout tests
  it('DashboardSkeleton has 5-column grid', () => {
    const { container } = render(<DashboardSkeleton />)
    const grid = container.querySelector('.lg\\:grid-cols-5')
    expect(grid).toBeInTheDocument()
  })

  it('DashboardSkeleton has col-span elements', () => {
    const { container } = render(<DashboardSkeleton />)
    const colSpan3 = container.querySelectorAll('.lg\\:col-span-3')
    const colSpan2 = container.querySelectorAll('.lg\\:col-span-2')
    expect(colSpan3.length).toBeGreaterThan(0)
    expect(colSpan2.length).toBeGreaterThan(0)
  })

  it('DailyHubSkeleton has 4 tab pills', () => {
    const { container } = render(<DailyHubSkeleton />)
    const tabBar = container.querySelector('.justify-center.gap-4')
    expect(tabBar).toBeInTheDocument()
    expect(tabBar!.children.length).toBe(4)
  })

  it('DailyHubSkeleton has 2-column hero grid', () => {
    const { container } = render(<DailyHubSkeleton />)
    const heroGrid = container.querySelector('.sm\\:grid-cols-2')
    expect(heroGrid).toBeInTheDocument()
  })

  it('PrayerWallSkeleton has 4 prayer cards', () => {
    const { container } = render(<PrayerWallSkeleton />)
    // Count cards that contain avatar circles (prayer cards)
    const prayerCards = container.querySelectorAll('.flex.items-start.gap-3')
    expect(prayerCards.length).toBe(4)
  })

  it('PrayerWallSkeleton has category filter pills', () => {
    const { container } = render(<PrayerWallSkeleton />)
    const filterRow = container.querySelector('.flex-wrap.gap-2')
    expect(filterRow).toBeInTheDocument()
    expect(filterRow!.children.length).toBe(6)
  })

  it('BibleBrowserSkeleton renders OT and NT sections', () => {
    const { container } = render(<BibleBrowserSkeleton />)
    const cards = container.querySelectorAll('[aria-hidden="true"].bg-white\\/\\[0\\.06\\].border')
    expect(cards.length).toBe(2)
  })

  it('BibleReaderSkeleton renders 20 verse blocks', () => {
    const { container } = render(<BibleReaderSkeleton />)
    const verseBlocks = container.querySelectorAll('.flex.items-start.gap-2')
    expect(verseBlocks.length).toBe(20)
  })

  it('GrowPageSkeleton has 2 tab pills', () => {
    const { container } = render(<GrowPageSkeleton />)
    const tabBar = container.querySelector('.flex.gap-4.mb-6')
    expect(tabBar).toBeInTheDocument()
    expect(tabBar!.children.length).toBe(2)
  })

  it('GrowPageSkeleton has 2-column plan grid', () => {
    const { container } = render(<GrowPageSkeleton />)
    const grid = container.querySelector('.sm\\:grid-cols-2')
    expect(grid).toBeInTheDocument()
    expect(grid!.children.length).toBe(4)
  })

  it('InsightsSkeleton has large chart placeholder', () => {
    const { container } = render(<InsightsSkeleton />)
    // Find a SkeletonBlock with 300px height inside a SkeletonCard
    const blocks = container.querySelectorAll('[aria-hidden="true"]')
    const chartBlock = Array.from(blocks).find(
      (el) => (el as HTMLElement).style?.height === '300px'
    )
    expect(chartBlock).toBeTruthy()
  })

  it('FriendsSkeleton has 5 friend cards', () => {
    const { container } = render(<FriendsSkeleton />)
    const friendCards = container.querySelectorAll('.flex.items-center.gap-3')
    expect(friendCards.length).toBe(5)
  })

  it('FriendsSkeleton has search input placeholder', () => {
    const { container } = render(<FriendsSkeleton />)
    const searchBlock = container.querySelector('.mb-6.rounded-lg')
    expect(searchBlock).toBeInTheDocument()
    expect((searchBlock as HTMLElement).style.height).toBe('44px')
  })

  it('SettingsSkeleton has sidebar layout', () => {
    const { container } = render(<SettingsSkeleton />)
    const sidebar = container.querySelector('.sm\\:w-\\[200px\\]')
    expect(sidebar).toBeInTheDocument()
  })

  it('MyPrayersSkeleton has composer + 4 prayer cards', () => {
    const { container } = render(<MyPrayersSkeleton />)
    const cards = container.querySelectorAll('[aria-hidden="true"].bg-white\\/\\[0\\.06\\].border')
    expect(cards.length).toBe(5) // 1 composer + 4 prayer cards
  })

  it('MusicSkeleton has 3 tab pills', () => {
    const { container } = render(<MusicSkeleton />)
    const tabBar = container.querySelector('.flex.gap-4.mb-6')
    expect(tabBar).toBeInTheDocument()
    expect(tabBar!.children.length).toBe(3)
  })

  it('ProfileSkeleton has large avatar circle', () => {
    const { container } = render(<ProfileSkeleton />)
    const blocks = container.querySelectorAll('[aria-hidden="true"]')
    const avatar = Array.from(blocks).find(
      (el) =>
        (el as HTMLElement).style?.width === '80px' &&
        (el as HTMLElement).style?.height === '80px'
    )
    expect(avatar).toBeTruthy()
  })

  it('ProfileSkeleton has badge grid', () => {
    const { container } = render(<ProfileSkeleton />)
    const badgeGrid = container.querySelector('.grid-cols-4')
    expect(badgeGrid).toBeInTheDocument()
    expect(badgeGrid!.children.length).toBe(12)
  })
})
