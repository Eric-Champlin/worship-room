import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GratitudeStreak } from '../GratitudeStreak'
import { getLocalDateString } from '@/utils/date'
import type { GratitudeEntry } from '@/services/gratitude-storage'

const STORAGE_KEY = 'wr_gratitude_entries'

function makeDateString(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return getLocalDateString(d)
}

function makeEntry(daysAgo: number): GratitudeEntry {
  return {
    id: `entry-${daysAgo}`,
    date: makeDateString(daysAgo),
    items: ['Test item'],
    createdAt: new Date().toISOString(),
  }
}

describe('GratitudeStreak', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when no entries exist', () => {
    const { container } = render(<GratitudeStreak />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when streak is only 1 day', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([makeEntry(0)]))
    const { container } = render(<GratitudeStreak />)
    expect(container.firstChild).toBeNull()
  })

  it('shows streak when 2+ consecutive days', () => {
    const entries = [makeEntry(0), makeEntry(1), makeEntry(2)]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))

    render(<GratitudeStreak />)
    expect(screen.getByText('Gratitude Streak: 3 days')).toBeInTheDocument()
  })

  it('shows correct description text', () => {
    const entries = [makeEntry(0), makeEntry(1)]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))

    render(<GratitudeStreak />)
    expect(
      screen.getByText("You've counted your blessings 2 days in a row"),
    ).toBeInTheDocument()
  })

  it('has correct aria-label', () => {
    const entries = [makeEntry(0), makeEntry(1)]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))

    render(<GratitudeStreak />)
    expect(screen.getByLabelText('Gratitude streak')).toBeInTheDocument()
  })
})
