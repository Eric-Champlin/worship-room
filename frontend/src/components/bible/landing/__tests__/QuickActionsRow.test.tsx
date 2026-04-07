import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { QuickActionsRow } from '../QuickActionsRow'

describe('QuickActionsRow', () => {
  it('renders three quick action cards', () => {
    render(
      <MemoryRouter>
        <QuickActionsRow />
      </MemoryRouter>
    )
    expect(screen.getByText('Browse Books')).toBeInTheDocument()
    expect(screen.getByText('My Bible')).toBeInTheDocument()
    expect(screen.getByText('Reading Plans')).toBeInTheDocument()
  })

  it('Browse Books links to /bible/browse', () => {
    render(
      <MemoryRouter>
        <QuickActionsRow />
      </MemoryRouter>
    )
    const link = screen.getByText('Browse Books').closest('a')
    expect(link?.getAttribute('href')).toBe('/bible/browse')
  })

  it('My Bible links to /bible/my', () => {
    render(
      <MemoryRouter>
        <QuickActionsRow />
      </MemoryRouter>
    )
    const link = screen.getByText('My Bible').closest('a')
    expect(link?.getAttribute('href')).toBe('/bible/my')
  })

  it('Reading Plans links to /bible/plans', () => {
    render(
      <MemoryRouter>
        <QuickActionsRow />
      </MemoryRouter>
    )
    const link = screen.getByText('Reading Plans').closest('a')
    expect(link?.getAttribute('href')).toBe('/bible/plans')
  })

  it('cards have minimum 44px tap targets', () => {
    const { container } = render(
      <MemoryRouter>
        <QuickActionsRow />
      </MemoryRouter>
    )
    const cards = container.querySelectorAll('.min-h-\\[44px\\]')
    expect(cards.length).toBe(3)
  })

  it('cards are keyboard accessible via links', () => {
    render(
      <MemoryRouter>
        <QuickActionsRow />
      </MemoryRouter>
    )
    const links = screen.getAllByRole('link')
    expect(links.length).toBe(3)
  })

  it('links have focus-visible ring', () => {
    render(
      <MemoryRouter>
        <QuickActionsRow />
      </MemoryRouter>
    )
    const links = screen.getAllByRole('link')
    links.forEach((link) => {
      expect(link.className).toContain('focus-visible:ring-2')
    })
  })
})
