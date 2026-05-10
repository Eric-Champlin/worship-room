import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WaysToHelpPills } from '../WaysToHelpPills'

describe('WaysToHelpPills', () => {
  it('renders nothing when tags array is empty', () => {
    const { container } = render(<WaysToHelpPills tags={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when only just_prayer is in tags (W5)', () => {
    const { container } = render(<WaysToHelpPills tags={['just_prayer']} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders Meals pill for [meals]', () => {
    render(<WaysToHelpPills tags={['meals']} />)
    expect(screen.getByText('Meals')).toBeInTheDocument()
    expect(screen.getByLabelText('Author would welcome: Meals')).toBeInTheDocument()
  })

  it('renders Meals + Visits in canonical order for [visits, meals] (non-canonical input)', () => {
    render(<WaysToHelpPills tags={['visits', 'meals']} />)
    const pills = screen.getAllByText(/Meals|Visits/)
    expect(pills.map((p) => p.textContent)).toEqual(['Meals', 'Visits'])
  })

  it('renders 4 pills for [meals, rides, errands, visits, just_prayer] (just_prayer suppressed)', () => {
    render(
      <WaysToHelpPills
        tags={['meals', 'rides', 'errands', 'visits', 'just_prayer']}
      />,
    )
    expect(screen.getByText('Meals')).toBeInTheDocument()
    expect(screen.getByText('Rides')).toBeInTheDocument()
    expect(screen.getByText('Errands')).toBeInTheDocument()
    expect(screen.getByText('Visits')).toBeInTheDocument()
    expect(screen.queryByText('Just prayer, please')).not.toBeInTheDocument()
  })
})
