import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GratitudeCorrelationCard } from '../GratitudeCorrelationCard'
import { InsightsDataProvider } from '@/contexts/InsightsDataContext'
import type { GratitudeEntry } from '@/services/gratitude-storage'
import type { MoodEntry } from '@/types/dashboard'

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

function makeGratitudeEntry(date: string): GratitudeEntry {
  return {
    id: `grat-${date}`,
    date,
    items: ['Thankful for today'],
    createdAt: new Date().toISOString(),
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('GratitudeCorrelationCard', () => {
  it('shows inline empty state when no gratitude entries', () => {
    render(
      <InsightsDataProvider>
        <GratitudeCorrelationCard />
      </InsightsDataProvider>,
    )
    expect(
      screen.getByText(/gratitude insights will grow as you count your blessings/i),
    ).toBeInTheDocument()
  })

  it('shows inline empty state when exactly 4 qualifying days', () => {
    const moods = [
      makeMoodEntry('2026-03-01', 4),
      makeMoodEntry('2026-03-02', 3),
      makeMoodEntry('2026-03-03', 5),
      makeMoodEntry('2026-03-04', 4),
      makeMoodEntry('2026-03-05', 3),
    ]
    const gratitude = [
      makeGratitudeEntry('2026-03-01'),
      makeGratitudeEntry('2026-03-02'),
      makeGratitudeEntry('2026-03-03'),
      makeGratitudeEntry('2026-03-04'),
    ]
    localStorage.setItem('wr_mood_entries', JSON.stringify(moods))
    localStorage.setItem('wr_gratitude_entries', JSON.stringify(gratitude))

    render(
      <InsightsDataProvider>
        <GratitudeCorrelationCard />
      </InsightsDataProvider>,
    )
    expect(
      screen.getByText(/gratitude insights will grow as you count your blessings/i),
    ).toBeInTheDocument()
  })

  it('renders card when 5+ qualifying days exist', () => {
    const moods = [
      makeMoodEntry('2026-03-01', 4),
      makeMoodEntry('2026-03-02', 3),
      makeMoodEntry('2026-03-03', 5),
      makeMoodEntry('2026-03-04', 4),
      makeMoodEntry('2026-03-05', 3),
    ]
    const gratitude = [
      makeGratitudeEntry('2026-03-01'),
      makeGratitudeEntry('2026-03-02'),
      makeGratitudeEntry('2026-03-03'),
      makeGratitudeEntry('2026-03-04'),
      makeGratitudeEntry('2026-03-05'),
    ]
    localStorage.setItem('wr_mood_entries', JSON.stringify(moods))
    localStorage.setItem('wr_gratitude_entries', JSON.stringify(gratitude))

    render(
      <InsightsDataProvider>
        <GratitudeCorrelationCard />
      </InsightsDataProvider>,
    )
    expect(screen.getByLabelText('Gratitude and mood correlation')).toBeInTheDocument()
  })

  it('calculates correct average mood for gratitude days', () => {
    // Gratitude days: moods 4, 5, 4, 5, 4 → avg = 4.4
    const moods = [
      makeMoodEntry('2026-03-01', 4),
      makeMoodEntry('2026-03-02', 5),
      makeMoodEntry('2026-03-03', 4),
      makeMoodEntry('2026-03-04', 5),
      makeMoodEntry('2026-03-05', 4),
      makeMoodEntry('2026-03-06', 2), // no gratitude
    ]
    const gratitude = [
      makeGratitudeEntry('2026-03-01'),
      makeGratitudeEntry('2026-03-02'),
      makeGratitudeEntry('2026-03-03'),
      makeGratitudeEntry('2026-03-04'),
      makeGratitudeEntry('2026-03-05'),
    ]
    localStorage.setItem('wr_mood_entries', JSON.stringify(moods))
    localStorage.setItem('wr_gratitude_entries', JSON.stringify(gratitude))

    render(
      <InsightsDataProvider>
        <GratitudeCorrelationCard />
      </InsightsDataProvider>,
    )
    expect(screen.getByText('4.4')).toBeInTheDocument()
  })

  it('shows positive message when gratitude days have higher mood', () => {
    // Gratitude days: mood 5 × 5 = avg 5.0; non-gratitude days: mood 2
    const moods = [
      makeMoodEntry('2026-03-01', 5),
      makeMoodEntry('2026-03-02', 5),
      makeMoodEntry('2026-03-03', 5),
      makeMoodEntry('2026-03-04', 5),
      makeMoodEntry('2026-03-05', 5),
      makeMoodEntry('2026-03-06', 2),
    ]
    const gratitude = [
      makeGratitudeEntry('2026-03-01'),
      makeGratitudeEntry('2026-03-02'),
      makeGratitudeEntry('2026-03-03'),
      makeGratitudeEntry('2026-03-04'),
      makeGratitudeEntry('2026-03-05'),
    ]
    localStorage.setItem('wr_mood_entries', JSON.stringify(moods))
    localStorage.setItem('wr_gratitude_entries', JSON.stringify(gratitude))

    render(
      <InsightsDataProvider>
        <GratitudeCorrelationCard />
      </InsightsDataProvider>,
    )
    expect(screen.getByText(/Gratitude seems to lift your spirits/)).toBeInTheDocument()
  })

  it('shows neutral message when gratitude days have equal/lower mood', () => {
    // All days have same mood → equal avg
    const moods = [
      makeMoodEntry('2026-03-01', 3),
      makeMoodEntry('2026-03-02', 3),
      makeMoodEntry('2026-03-03', 3),
      makeMoodEntry('2026-03-04', 3),
      makeMoodEntry('2026-03-05', 3),
      makeMoodEntry('2026-03-06', 3),
    ]
    const gratitude = [
      makeGratitudeEntry('2026-03-01'),
      makeGratitudeEntry('2026-03-02'),
      makeGratitudeEntry('2026-03-03'),
      makeGratitudeEntry('2026-03-04'),
      makeGratitudeEntry('2026-03-05'),
    ]
    localStorage.setItem('wr_mood_entries', JSON.stringify(moods))
    localStorage.setItem('wr_gratitude_entries', JSON.stringify(gratitude))

    render(
      <InsightsDataProvider>
        <GratitudeCorrelationCard />
      </InsightsDataProvider>,
    )
    expect(screen.getByText(/Every act of gratitude matters/)).toBeInTheDocument()
  })

  it('displays correct qualifying day count', () => {
    const moods = Array.from({ length: 7 }, (_, i) =>
      makeMoodEntry(`2026-03-0${i + 1}`, 4),
    )
    const gratitude = Array.from({ length: 7 }, (_, i) =>
      makeGratitudeEntry(`2026-03-0${i + 1}`),
    )
    localStorage.setItem('wr_mood_entries', JSON.stringify(moods))
    localStorage.setItem('wr_gratitude_entries', JSON.stringify(gratitude))

    render(
      <InsightsDataProvider>
        <GratitudeCorrelationCard />
      </InsightsDataProvider>,
    )
    expect(screen.getByText(/Based on 7 days of data/)).toBeInTheDocument()
  })

  it('card uses frosted glass styling', () => {
    const moods = Array.from({ length: 5 }, (_, i) =>
      makeMoodEntry(`2026-03-0${i + 1}`, 4),
    )
    const gratitude = Array.from({ length: 5 }, (_, i) =>
      makeGratitudeEntry(`2026-03-0${i + 1}`),
    )
    localStorage.setItem('wr_mood_entries', JSON.stringify(moods))
    localStorage.setItem('wr_gratitude_entries', JSON.stringify(gratitude))

    render(
      <InsightsDataProvider>
        <GratitudeCorrelationCard />
      </InsightsDataProvider>,
    )
    const section = screen.getByLabelText('Gratitude and mood correlation')
    expect(section.className).toContain('bg-white/5')
    expect(section.className).toContain('backdrop-blur-sm')
    expect(section.className).toContain('border-white/10')
    expect(section.className).toContain('rounded-2xl')
  })
})
