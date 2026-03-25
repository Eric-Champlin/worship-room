import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MonthHeatmap } from '../MonthHeatmap'
import type { MoodEntry } from '@/types/dashboard'

function makeMoodEntry(date: string, mood: 1 | 2 | 3 | 4 | 5 = 4): MoodEntry {
  const labels = { 1: 'Struggling', 2: 'Heavy', 3: 'Okay', 4: 'Good', 5: 'Thriving' } as const
  return {
    id: `entry-${date}`,
    date,
    mood,
    moodLabel: labels[mood],
    timestamp: new Date(date + 'T12:00:00').getTime(),
    verseSeen: 'Psalm 23:1',
  }
}

describe('MonthHeatmap', () => {
  it('renders grid of day squares', () => {
    const { container } = render(
      <MonthHeatmap month={1} year={2026} monthName="February" entries={[]} />,
    )
    // Should render day cells (h-3 w-3 rounded-sm)
    const cells = container.querySelectorAll('.rounded-sm')
    expect(cells.length).toBeGreaterThan(0)
  })

  it('displays correct month title', () => {
    render(
      <MonthHeatmap month={1} year={2026} monthName="February" entries={[]} />,
    )
    expect(screen.getByText('Your February at a Glance')).toBeInTheDocument()
  })

  it('applies mood colors to squares with entries', () => {
    const entries = [makeMoodEntry('2026-02-10', 4)] // Good = #2DD4BF
    const { container } = render(
      <MonthHeatmap month={1} year={2026} monthName="February" entries={entries} />,
    )
    const coloredCells = container.querySelectorAll('[style]')
    const hasCorrectColor = Array.from(coloredCells).some(
      (cell) => (cell as HTMLElement).style.backgroundColor === 'rgb(45, 212, 191)',
    )
    expect(hasCorrectColor).toBe(true)
  })

  it('shows muted color for days without entries', () => {
    const { container } = render(
      <MonthHeatmap month={1} year={2026} monthName="February" entries={[]} />,
    )
    const mutedCells = container.querySelectorAll('.bg-white\\/\\[0\\.04\\]')
    expect(mutedCells.length).toBeGreaterThan(0)
  })
})
