import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { Daily } from '@/pages/Daily'

function renderDaily() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Daily />
    </MemoryRouter>
  )
}

describe('Daily', () => {
  it('renders the page heading', () => {
    renderDaily()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Daily Verse & Song' })
    ).toBeInTheDocument()
  })

  it('renders the description text', () => {
    renderDaily()
    expect(
      screen.getByText(/scripture verse and a worship song recommendation/i)
    ).toBeInTheDocument()
  })

  it('renders the Coming Soon indicator', () => {
    renderDaily()
    expect(screen.getByText('Coming Soon')).toBeInTheDocument()
  })
})
