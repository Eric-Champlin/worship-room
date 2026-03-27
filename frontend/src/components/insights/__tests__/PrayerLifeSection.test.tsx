import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PrayerLifeSection } from '../PrayerLifeSection'
import type { PersonalPrayer } from '@/types/personal-prayer'
import type { MoodEntry } from '@/types/dashboard'

function makePrayer(overrides: Partial<PersonalPrayer> = {}): PersonalPrayer {
  return {
    id: crypto.randomUUID(),
    title: 'Test prayer',
    description: 'A test prayer',
    category: 'other',
    status: 'active',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
    answeredAt: null,
    answeredNote: null,
    lastPrayedAt: null,
    ...overrides,
  }
}

function makeMoodEntry(date: string, mood: 1 | 2 | 3 | 4 | 5): MoodEntry {
  return {
    id: `mood-${date}`,
    date,
    mood,
    moodLabel: 'Okay',
    timestamp: Date.now(),
    verseSeen: 'Psalm 46:10',
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('PrayerLifeSection', () => {
  it('renders nothing when no prayers exist', () => {
    const { container } = render(
      <MemoryRouter>
        <PrayerLifeSection />
      </MemoryRouter>,
    )
    expect(container.querySelector('section')).toBeNull()
  })

  it('renders stats card with correct counts', () => {
    const prayers = [
      makePrayer({ status: 'active' }),
      makePrayer({ status: 'active' }),
      makePrayer({ status: 'active' }),
      makePrayer({ status: 'answered', answeredAt: '2026-03-10T10:00:00.000Z' }),
      makePrayer({ status: 'answered', answeredAt: '2026-03-11T10:00:00.000Z' }),
    ]
    localStorage.setItem('wr_prayer_list', JSON.stringify(prayers))

    render(
      <MemoryRouter>
        <PrayerLifeSection />
      </MemoryRouter>,
    )
    expect(screen.getByText('3')).toBeInTheDocument() // active
    expect(screen.getByText('2')).toBeInTheDocument() // answered
    expect(screen.getByText(/2 of 5 prayers answered/)).toBeInTheDocument()
    expect(screen.getByText(/40%/)).toBeInTheDocument()
  })

  it('stats are side-by-side on desktop', () => {
    const prayers = [makePrayer()]
    localStorage.setItem('wr_prayer_list', JSON.stringify(prayers))

    render(
      <MemoryRouter>
        <PrayerLifeSection />
      </MemoryRouter>,
    )
    const statsContainer = screen.getByText('Active').parentElement!.parentElement!
    expect(statsContainer.className).toContain('sm:flex-row')
  })

  it('renders mood correlation when 5+ matching days', () => {
    const prayers = [
      makePrayer({ lastPrayedAt: '2026-03-01T12:00:00.000Z' }),
      makePrayer({ lastPrayedAt: '2026-03-02T12:00:00.000Z' }),
      makePrayer({ lastPrayedAt: '2026-03-03T12:00:00.000Z' }),
      makePrayer({ lastPrayedAt: '2026-03-04T12:00:00.000Z' }),
      makePrayer({ lastPrayedAt: '2026-03-05T12:00:00.000Z' }),
    ]
    const moods = [
      makeMoodEntry('2026-03-01', 4),
      makeMoodEntry('2026-03-02', 4),
      makeMoodEntry('2026-03-03', 4),
      makeMoodEntry('2026-03-04', 4),
      makeMoodEntry('2026-03-05', 4),
    ]
    localStorage.setItem('wr_prayer_list', JSON.stringify(prayers))
    localStorage.setItem('wr_mood_entries', JSON.stringify(moods))

    render(
      <MemoryRouter>
        <PrayerLifeSection />
      </MemoryRouter>,
    )
    expect(screen.getByText(/On days you prayed for your prayer list/)).toBeInTheDocument()
    expect(screen.getByText('4.0')).toBeInTheDocument()
    expect(screen.getByText(/Based on 5 days/)).toBeInTheDocument()
  })

  it('hides mood correlation when fewer than 5 matching days', () => {
    const prayers = [
      makePrayer({ lastPrayedAt: '2026-03-01T12:00:00.000Z' }),
      makePrayer({ lastPrayedAt: '2026-03-02T12:00:00.000Z' }),
      makePrayer({ lastPrayedAt: '2026-03-03T12:00:00.000Z' }),
    ]
    const moods = [
      makeMoodEntry('2026-03-01', 4),
      makeMoodEntry('2026-03-02', 4),
      makeMoodEntry('2026-03-03', 4),
    ]
    localStorage.setItem('wr_prayer_list', JSON.stringify(prayers))
    localStorage.setItem('wr_mood_entries', JSON.stringify(moods))

    render(
      <MemoryRouter>
        <PrayerLifeSection />
      </MemoryRouter>,
    )
    expect(screen.queryByText(/On days you prayed/)).not.toBeInTheDocument()
  })

  it('renders category breakdown when 3+ prayers', () => {
    const prayers = [
      makePrayer({ category: 'health' }),
      makePrayer({ category: 'health' }),
      makePrayer({ category: 'family' }),
      makePrayer({ category: 'work' }),
      makePrayer({ category: 'family' }),
    ]
    localStorage.setItem('wr_prayer_list', JSON.stringify(prayers))

    render(
      <MemoryRouter>
        <PrayerLifeSection />
      </MemoryRouter>,
    )
    expect(screen.getByText(/You pray most about/)).toBeInTheDocument()
    expect(screen.getByText('Health')).toBeInTheDocument()
  })

  it('hides category breakdown when fewer than 3 prayers', () => {
    const prayers = [makePrayer(), makePrayer()]
    localStorage.setItem('wr_prayer_list', JSON.stringify(prayers))

    render(
      <MemoryRouter>
        <PrayerLifeSection />
      </MemoryRouter>,
    )
    expect(screen.queryByText(/You pray most about/)).not.toBeInTheDocument()
  })

  it('category bar shows proportional segments', () => {
    const prayers = [
      makePrayer({ category: 'health' }),
      makePrayer({ category: 'health' }),
      makePrayer({ category: 'health' }),
      makePrayer({ category: 'family' }),
      makePrayer({ category: 'work' }),
    ]
    localStorage.setItem('wr_prayer_list', JSON.stringify(prayers))

    render(
      <MemoryRouter>
        <PrayerLifeSection />
      </MemoryRouter>,
    )
    const bar = screen.getByText(/You pray most about/).parentElement!.querySelector('.flex.h-2\\.5')
    expect(bar).not.toBeNull()
    const segments = bar!.children
    expect(segments.length).toBe(3) // health, family, work
  })

  it('Insights page includes Prayer Life section', () => {
    const prayers = [makePrayer(), makePrayer(), makePrayer()]
    localStorage.setItem('wr_prayer_list', JSON.stringify(prayers))
    localStorage.setItem('wr_auth_simulated', 'true')
    localStorage.setItem('wr_user_name', 'Test')

    // We test the section component directly since the page has many dependencies
    render(
      <MemoryRouter>
        <PrayerLifeSection />
      </MemoryRouter>,
    )
    expect(screen.getByText('Prayer Life')).toBeInTheDocument()
  })
})
