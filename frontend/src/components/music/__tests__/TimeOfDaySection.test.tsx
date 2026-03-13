import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TimeOfDaySection } from '../TimeOfDaySection'

vi.mock('@/hooks/useTimeOfDayRecommendations', () => ({
  useTimeOfDayRecommendations: () => ({
    heading: 'Suggested for You',
    items: [
      {
        id: 'morning-mist',
        type: 'scene' as const,
        title: 'Morning Mist',
        subtitle: 'A peaceful dawn',
        artworkFilename: 'morning-mist.jpg',
      },
      {
        id: 'still-waters',
        type: 'scene' as const,
        title: 'Still Waters',
        subtitle: 'Calm reflections',
        artworkFilename: 'still-waters.jpg',
      },
    ],
    timeBracket: 'morning' as const,
  }),
}))

describe('TimeOfDaySection', () => {
  it('has aria-label="Suggested for this time of day"', () => {
    render(<TimeOfDaySection />)
    expect(
      screen.getByLabelText('Suggested for this time of day'),
    ).toBeInTheDocument()
  })

  it('renders heading and cards', () => {
    render(<TimeOfDaySection />)
    expect(screen.getByText('Suggested for You')).toBeInTheDocument()
    expect(screen.getByText('Morning Mist')).toBeInTheDocument()
    expect(screen.getByText('Still Waters')).toBeInTheDocument()
  })
})
