import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProfileBadgeShowcase } from '../ProfileBadgeShowcase'
import { BADGE_DEFINITIONS, FRESH_ACTIVITY_COUNTS } from '@/constants/dashboard/badges'
import type { BadgeData } from '@/types/dashboard'

const SAMPLE_BADGES: BadgeData = {
  earned: {
    welcome: { earnedAt: '2026-01-01T00:00:00.000Z' },
    level_1: { earnedAt: '2026-01-01T00:00:00.000Z' },
    level_2: { earnedAt: '2026-02-01T00:00:00.000Z' },
  },
  newlyEarned: [],
  activityCounts: { ...FRESH_ACTIVITY_COUNTS },
}

describe('ProfileBadgeShowcase', () => {
  it('shows earned count', () => {
    render(<ProfileBadgeShowcase badgeData={SAMPLE_BADGES} isOwnProfile={false} />)
    expect(screen.getByText(`Badges (3/${BADGE_DEFINITIONS.length})`)).toBeTruthy()
  })

  it('earned badge does not have grayscale class', () => {
    render(<ProfileBadgeShowcase badgeData={SAMPLE_BADGES} isOwnProfile={false} />)
    const welcomeBtn = screen.getByLabelText(/Welcome to Worship Room, earned/)
    const circle = welcomeBtn.querySelector('div')!
    expect(circle.className).not.toContain('grayscale')
  })

  it('locked badge has grayscale class', () => {
    render(<ProfileBadgeShowcase badgeData={SAMPLE_BADGES} isOwnProfile={false} />)
    const lockedBtn = screen.getByLabelText(/Year of Faith, locked/)
    const circle = lockedBtn.querySelector('div')!
    expect(circle.className).toContain('grayscale')
  })

  it('renders all badge definitions', () => {
    render(<ProfileBadgeShowcase badgeData={SAMPLE_BADGES} isOwnProfile={false} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(BADGE_DEFINITIONS.length)
  })
})
