import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ActivityCorrelations } from '../ActivityCorrelations'

// Mock ResizeObserver for Recharts
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

describe('ActivityCorrelations', () => {
  it('renders bar chart container with data', () => {
    render(<ActivityCorrelations hasData={true} />)
    expect(
      screen.getByRole('img', { name: /activity and mood correlation/i }),
    ).toBeInTheDocument()
  })

  it('shows empty state when no data', () => {
    render(<ActivityCorrelations hasData={false} />)
    expect(
      screen.getByText(/check in for a few days/i),
    ).toBeInTheDocument()
  })

  it('disclaimer visible with data', () => {
    render(<ActivityCorrelations hasData={true} />)
    expect(
      screen.getByText(/based on example data\. real correlations coming soon/i),
    ).toBeInTheDocument()
  })

  it('section title is Activity & Mood', () => {
    render(<ActivityCorrelations hasData={true} />)
    expect(
      screen.getByRole('heading', { name: /activity & mood/i }),
    ).toBeInTheDocument()
  })
})
