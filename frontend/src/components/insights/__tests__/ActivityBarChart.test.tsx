import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ActivityBarChart } from '../ActivityBarChart'

// Mock ResizeObserver for Recharts
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

const mockCounts = {
  mood: 24,
  pray: 18,
  journal: 15,
  meditate: 10,
  listen: 20,
  prayerWall: 8,
}

describe('ActivityBarChart', () => {
  it('renders section with title', () => {
    render(<ActivityBarChart activityCounts={mockCounts} />)
    expect(screen.getByText('Your Top Activities')).toBeInTheDocument()
  })

  it('has aria-label with text summary', () => {
    const { container } = render(<ActivityBarChart activityCounts={mockCounts} />)
    const section = container.querySelector('section')
    const ariaLabel = section?.getAttribute('aria-label') ?? ''
    expect(ariaLabel).toContain('Check-in: 24')
    expect(ariaLabel).toContain('Pray: 18')
    expect(ariaLabel).toContain('Journal: 15')
    expect(ariaLabel).toContain('Meditate: 10')
    expect(ariaLabel).toContain('Listen: 20')
    expect(ariaLabel).toContain('Prayer Wall: 8')
  })

  it('renders frosted glass card', () => {
    const { container } = render(<ActivityBarChart activityCounts={mockCounts} />)
    const card = container.querySelector('.rounded-2xl')
    expect(card).toBeInTheDocument()
  })

  it('renders Recharts container', () => {
    const { container } = render(<ActivityBarChart activityCounts={mockCounts} />)
    // Recharts renders a div with class recharts-wrapper or the ResponsiveContainer
    const chartContainer = container.querySelector('.recharts-responsive-container')
    expect(chartContainer).toBeInTheDocument()
  })
})
