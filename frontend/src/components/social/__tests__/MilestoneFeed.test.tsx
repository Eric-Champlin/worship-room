import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, cleanup } from '@testing-library/react'
import { MilestoneFeed } from '../MilestoneFeed'
import { MILESTONE_KEY } from '@/services/social-storage'
import type { MilestoneEvent } from '@/types/dashboard'

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

const MOCK_EVENTS: MilestoneEvent[] = [
  { id: 'ms-1', type: 'streak_milestone', userId: 'f1', displayName: 'Maria L.', avatar: '', detail: '90', timestamp: hoursAgo(2) },
  { id: 'ms-2', type: 'level_up', userId: 'f2', displayName: 'James K.', avatar: '', detail: 'Blooming', timestamp: hoursAgo(26) },
  { id: 'ms-3', type: 'badge_earned', userId: 'f3', displayName: 'Grace H.', avatar: '', detail: 'Burning Bright', timestamp: hoursAgo(50) },
  { id: 'ms-4', type: 'points_milestone', userId: 'f4', displayName: 'Joshua B.', avatar: '', detail: '12,000', timestamp: hoursAgo(74) },
  { id: 'ms-5', type: 'streak_milestone', userId: 'f1', displayName: 'Maria L.', avatar: '', detail: '30', timestamp: hoursAgo(98) },
]

function resetState() {
  cleanup()
  localStorage.clear()
}

describe('MilestoneFeed', () => {
  beforeEach(resetState)
  afterEach(resetState)

  it('renders mock events on first load (no wr_milestone_feed)', () => {
    render(<MilestoneFeed />)
    // Should render something (mock data seeded internally)
    const list = screen.getByRole('list', { name: /friend milestones/i })
    expect(list).toBeInTheDocument()
    const items = within(list).getAllByRole('listitem')
    expect(items.length).toBeGreaterThan(0)
  })

  it('shows maxItems entries', () => {
    localStorage.setItem(MILESTONE_KEY, JSON.stringify(MOCK_EVENTS))
    render(<MilestoneFeed maxItems={3} />)
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items).toHaveLength(3)
  })

  it('formats streak_milestone correctly', () => {
    localStorage.setItem(MILESTONE_KEY, JSON.stringify([MOCK_EVENTS[0]]))
    render(<MilestoneFeed maxItems={5} />)
    expect(screen.getByText('Maria L. hit a 90-day streak!')).toBeInTheDocument()
  })

  it('formats level_up correctly', () => {
    localStorage.setItem(MILESTONE_KEY, JSON.stringify([MOCK_EVENTS[1]]))
    render(<MilestoneFeed maxItems={5} />)
    expect(screen.getByText('James K. leveled up to Blooming!')).toBeInTheDocument()
  })

  it('formats badge_earned correctly', () => {
    localStorage.setItem(MILESTONE_KEY, JSON.stringify([MOCK_EVENTS[2]]))
    render(<MilestoneFeed maxItems={5} />)
    expect(screen.getByText('Grace H. earned Burning Bright!')).toBeInTheDocument()
  })

  it('formats points_milestone correctly', () => {
    localStorage.setItem(MILESTONE_KEY, JSON.stringify([MOCK_EVENTS[3]]))
    render(<MilestoneFeed maxItems={5} />)
    expect(screen.getByText('Joshua B. reached 12,000 Faith Points!')).toBeInTheDocument()
  })

  it('shows relative timestamps', () => {
    localStorage.setItem(MILESTONE_KEY, JSON.stringify([MOCK_EVENTS[0]]))
    render(<MilestoneFeed maxItems={5} />)
    // Should show "2 hours ago" for an event 2 hours old
    expect(screen.getByText('2 hours ago')).toBeInTheDocument()
  })

  it('shows 24px avatars with initials', () => {
    localStorage.setItem(MILESTONE_KEY, JSON.stringify([MOCK_EVENTS[0]]))
    render(<MilestoneFeed maxItems={5} />)
    const avatar = screen.getByText('ML')
    expect(avatar.className).toContain('h-6')
    expect(avatar.className).toContain('w-6')
    expect(avatar.className).toContain('rounded-full')
  })

  it('uses semantic list markup (ol > li)', () => {
    localStorage.setItem(MILESTONE_KEY, JSON.stringify(MOCK_EVENTS))
    render(<MilestoneFeed maxItems={3} />)
    const list = screen.getByRole('list', { name: /friend milestones/i })
    expect(list.tagName).toBe('OL')
    const items = within(list).getAllByRole('listitem')
    expect(items[0].tagName).toBe('LI')
  })

  it('prefers-reduced-motion: uses motion-safe prefix', () => {
    localStorage.setItem(MILESTONE_KEY, JSON.stringify([MOCK_EVENTS[0]]))
    render(<MilestoneFeed maxItems={5} />)
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items[0].className).toContain('motion-safe:')
  })

  it('sorts events most recent first', () => {
    const events = [
      { ...MOCK_EVENTS[3], timestamp: hoursAgo(100) }, // oldest
      { ...MOCK_EVENTS[0], timestamp: hoursAgo(1) },   // newest
    ]
    localStorage.setItem(MILESTONE_KEY, JSON.stringify(events))
    render(<MilestoneFeed maxItems={5} />)
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    // First item should be the newest
    expect(within(items[0]).getByText(/maria l/i)).toBeInTheDocument()
  })

  it('defaults maxItems to 3', () => {
    localStorage.setItem(MILESTONE_KEY, JSON.stringify(MOCK_EVENTS))
    render(<MilestoneFeed />)
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items).toHaveLength(3)
  })
})
