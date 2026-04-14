import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { QuickActionsRow } from '../QuickActionsRow'
import { BibleDrawerProvider } from '@/components/bible/BibleDrawerProvider'

function renderWithProviders() {
  return render(
    <MemoryRouter>
      <BibleDrawerProvider>
        <QuickActionsRow />
      </BibleDrawerProvider>
    </MemoryRouter>
  )
}

describe('QuickActionsRow', () => {
  it('renders three quick action cards', () => {
    renderWithProviders()
    expect(screen.getByText('Browse Books')).toBeInTheDocument()
    expect(screen.getByText('My Bible')).toBeInTheDocument()
    expect(screen.getByText('Reading Plans')).toBeInTheDocument()
  })

  it('Browse Books is now a button, not a link', () => {
    renderWithProviders()
    const browseEl = screen.getByText('Browse Books').closest('button')
    expect(browseEl).toBeInTheDocument()
    expect(screen.getByText('Browse Books').closest('a')).toBeNull()
  })

  it('My Bible links to /bible/my', () => {
    renderWithProviders()
    const link = screen.getByText('My Bible').closest('a')
    expect(link?.getAttribute('href')).toBe('/bible/my')
  })

  it('Reading Plans links to /bible/plans', () => {
    renderWithProviders()
    const link = screen.getByText('Reading Plans').closest('a')
    expect(link?.getAttribute('href')).toBe('/bible/plans')
  })

  it('My Bible and Reading Plans remain as links', () => {
    renderWithProviders()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', '/bible/my')
    expect(links[1]).toHaveAttribute('href', '/bible/plans')
  })

  it('cards have minimum 44px tap targets', () => {
    const { container } = renderWithProviders()
    const cards = container.querySelectorAll('.min-h-\\[44px\\]')
    expect(cards.length).toBe(3)
  })
})
