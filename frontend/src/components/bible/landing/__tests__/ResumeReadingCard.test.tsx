import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ResumeReadingCard } from '../ResumeReadingCard'

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('ResumeReadingCard', () => {
  it('renders resume state with book and chapter', () => {
    renderWithRouter(
      <ResumeReadingCard
        lastRead={{ book: 'John', chapter: 3, verse: 16, timestamp: Date.now() }}
      />
    )
    expect(screen.getByText('Pick up where you left off')).toBeInTheDocument()
    expect(screen.getByText('John 3')).toBeInTheDocument()
  })

  it('links to correct chapter route', () => {
    renderWithRouter(
      <ResumeReadingCard
        lastRead={{ book: 'John', chapter: 3, verse: 16, timestamp: Date.now() }}
      />
    )
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/bible/john/3')
  })

  it('shows relative timestamp', () => {
    const fiveMinAgo = Date.now() - 5 * 60 * 1000
    renderWithRouter(
      <ResumeReadingCard
        lastRead={{ book: 'John', chapter: 3, verse: 16, timestamp: fiveMinAgo }}
      />
    )
    expect(screen.getByText('5 minutes ago')).toBeInTheDocument()
  })

  it('renders first-run state when lastRead is null', () => {
    renderWithRouter(<ResumeReadingCard lastRead={null} />)
    expect(screen.getByText('Start your first reading')).toBeInTheDocument()
    expect(screen.getByText('Open the Bible and begin anywhere')).toBeInTheDocument()
  })

  it('first-run links to /bible/browse', () => {
    renderWithRouter(<ResumeReadingCard lastRead={null} />)
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/bible/browse')
  })

  it('populated card has stronger shadow', () => {
    const { container } = renderWithRouter(
      <ResumeReadingCard
        lastRead={{ book: 'John', chapter: 3, verse: 16, timestamp: Date.now() }}
      />
    )
    const article = container.querySelector('article')
    expect(article?.className).toContain('0.12')
  })

  it('empty state card has primary weight', () => {
    const { container } = renderWithRouter(<ResumeReadingCard lastRead={null} />)
    const article = container.querySelector('article')
    expect(article?.className).toContain('0.12')
  })

  it('link has focus-visible ring', () => {
    renderWithRouter(
      <ResumeReadingCard
        lastRead={{ book: 'John', chapter: 3, verse: 16, timestamp: Date.now() }}
      />
    )
    const link = screen.getByRole('link')
    expect(link.className).toContain('focus-visible:ring-2')
  })
})
