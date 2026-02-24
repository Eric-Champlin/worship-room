import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { Listen } from '@/pages/Listen'

function renderListen() {
  return render(
    <MemoryRouter>
      <Listen />
    </MemoryRouter>
  )
}

describe('Listen', () => {
  it('renders the page heading', () => {
    renderListen()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Listen' })
    ).toBeInTheDocument()
  })

  it('renders the description text', () => {
    renderListen()
    expect(
      screen.getByText(/audio scripture, spoken prayers, and calming content/i)
    ).toBeInTheDocument()
  })

  it('renders the Coming Soon indicator', () => {
    renderListen()
    expect(screen.getByText('Coming Soon')).toBeInTheDocument()
  })
})
