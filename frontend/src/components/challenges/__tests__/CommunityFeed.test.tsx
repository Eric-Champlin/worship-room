import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CommunityFeed, type ChallengeStatus } from '../CommunityFeed'
import { getActivityItems } from '@/data/challenge-community-feed'

function renderFeed(
  status: ChallengeStatus = 'active',
  overrides?: {
    dayNumber?: number
    challengeDuration?: number
    remindersCount?: number
    activeParticipantsCount?: number
    completedCount?: number
    startDateLabel?: string
    hasReminder?: boolean
    onToggleReminder?: () => void
  },
) {
  return render(
    <CommunityFeed
      status={status}
      dayNumber={overrides?.dayNumber ?? 5}
      challengeDuration={overrides?.challengeDuration ?? 40}
      remindersCount={overrides?.remindersCount}
      activeParticipantsCount={overrides?.activeParticipantsCount}
      completedCount={overrides?.completedCount}
      startDateLabel={overrides?.startDateLabel}
      hasReminder={overrides?.hasReminder}
      onToggleReminder={overrides?.onToggleReminder}
    />,
  )
}

describe('CommunityFeed', () => {
  describe('upcoming state', () => {
    it('renders reminder count with singular pluralization', () => {
      renderFeed('upcoming', { remindersCount: 1 })
      expect(screen.getByText(/person is waiting to start/)).toBeInTheDocument()
    })

    it('renders reminder count with plural pluralization', () => {
      renderFeed('upcoming', { remindersCount: 5 })
      expect(screen.getByText(/people are waiting to start/)).toBeInTheDocument()
    })

    it('renders 0 count with plural "are" not "is"', () => {
      renderFeed('upcoming', { remindersCount: 0 })
      expect(screen.getByText(/people are waiting to start/)).toBeInTheDocument()
    })

    it('defaults remindersCount to 0 when not provided', () => {
      renderFeed('upcoming')
      // Should render "0 people are waiting"
      const strong = screen.getByText('0')
      expect(strong).toBeInTheDocument()
    })

    it('renders startDateLabel in copy when provided', () => {
      renderFeed('upcoming', { startDateLabel: 'May 24, 2026' })
      expect(screen.getByText(/on May 24, 2026/)).toBeInTheDocument()
    })

    it('renders Remind me CTA when onToggleReminder is provided', () => {
      renderFeed('upcoming', { onToggleReminder: vi.fn() })
      expect(screen.getByRole('button', { name: /Set reminder/ })).toBeInTheDocument()
    })

    it('HIDES CTA when onToggleReminder is undefined', () => {
      renderFeed('upcoming')
      expect(screen.queryByRole('button')).toBeNull()
    })

    it('DOES NOT render activity feed', () => {
      renderFeed('upcoming', { remindersCount: 10 })
      expect(screen.queryByRole('list')).toBeNull()
    })

    it('DOES NOT render "Pray for the community"', () => {
      renderFeed('upcoming', { remindersCount: 10 })
      expect(screen.queryByText(/pray for the community/i)).toBeNull()
    })

    it('hasReminder=true renders Check icon and "Reminder set" text with aria-pressed', () => {
      renderFeed('upcoming', { hasReminder: true, onToggleReminder: vi.fn() })
      const btn = screen.getByRole('button', { name: 'Remove reminder' })
      expect(btn).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByText('Reminder set')).toBeInTheDocument()
    })

    it('clicking Remind me fires onToggleReminder exactly once', () => {
      const onToggleReminder = vi.fn()
      renderFeed('upcoming', { onToggleReminder })
      fireEvent.click(screen.getByRole('button', { name: /Set reminder/ }))
      expect(onToggleReminder).toHaveBeenCalledTimes(1)
    })
  })

  describe('active state', () => {
    it('renders 6 activity items', () => {
      renderFeed('active')
      const items = screen.getAllByRole('listitem')
      expect(items).toHaveLength(6)
    })

    it('items are deterministic (same day = same items)', () => {
      const first = getActivityItems(10, 40, 6)
      const second = getActivityItems(10, 40, 6)
      expect(first).toEqual(second)
    })

    it('renders participant count when provided', () => {
      renderFeed('active', { activeParticipantsCount: 1847 })
      expect(screen.getByText(/1847 people participating/)).toBeInTheDocument()
    })

    it('HIDES participant count when undefined', () => {
      renderFeed('active')
      expect(screen.queryByText(/participating/)).toBeNull()
    })

    it('DOES NOT render "Pray for the community"', () => {
      renderFeed('active')
      expect(screen.queryByText(/pray for the community/i)).toBeNull()
    })

    it('pluralizes participant count singular', () => {
      renderFeed('active', { activeParticipantsCount: 1 })
      expect(screen.getByText(/1 person participating/)).toBeInTheDocument()
    })
  })

  describe('completed state', () => {
    it('renders Award icon and count', () => {
      const { container } = renderFeed('completed', { completedCount: 500 })
      expect(container.querySelector('svg.h-8')).not.toBeNull()
      expect(screen.getByText(/500/)).toBeInTheDocument()
      expect(screen.getByText(/people completed this challenge/)).toBeInTheDocument()
    })

    it('pluralizes 1 person vs N people', () => {
      renderFeed('completed', { completedCount: 1 })
      expect(screen.getByText(/person completed this challenge/)).toBeInTheDocument()
    })

    it('defaults count to 0 when not provided', () => {
      renderFeed('completed')
      expect(screen.getByText('0')).toBeInTheDocument()
      expect(screen.getByText(/people completed this challenge/)).toBeInTheDocument()
    })

    it('does NOT render activity feed', () => {
      renderFeed('completed', { completedCount: 500 })
      expect(screen.queryByRole('list')).toBeNull()
    })

    it('does NOT render "Pray for the community"', () => {
      renderFeed('completed', { completedCount: 500 })
      expect(screen.queryByText(/pray for the community/i)).toBeNull()
    })
  })

  describe('shared behavior', () => {
    it('renders "Challenge Community" heading for all states', () => {
      for (const status of ['upcoming', 'active', 'completed'] as ChallengeStatus[]) {
        const { unmount } = renderFeed(status)
        expect(screen.getByRole('heading', { name: 'Challenge Community' })).toBeInTheDocument()
        unmount()
      }
    })

    it('no hardcoded prayer-wall filter URL appears in any state', () => {
      for (const status of ['upcoming', 'active', 'completed'] as ChallengeStatus[]) {
        const { container, unmount } = renderFeed(status, { completedCount: 10, remindersCount: 10 })
        const links = container.querySelectorAll('a[href*="prayer-wall"]')
        expect(links.length).toBe(0)
        unmount()
      }
    })
  })
})
