import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { Insights } from '@/pages/Insights'

function renderInsights() {
  return render(
    <MemoryRouter>
      <Insights />
    </MemoryRouter>
  )
}

describe('Insights', () => {
  it('renders the page heading', () => {
    renderInsights()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Reflect' })
    ).toBeInTheDocument()
  })

  it('renders the description text', () => {
    renderInsights()
    expect(
      screen.getByText(/track your spiritual journey and discover patterns/i)
    ).toBeInTheDocument()
  })

  it('renders the Coming Soon indicator', () => {
    renderInsights()
    expect(screen.getByText('Coming Soon')).toBeInTheDocument()
  })
})
