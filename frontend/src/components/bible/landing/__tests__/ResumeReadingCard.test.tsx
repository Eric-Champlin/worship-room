import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ResumeReadingCard } from '../ResumeReadingCard'

const DEFAULT_PROPS = {
  book: 'John',
  chapter: 3,
  slug: 'john',
  relativeTime: '3 hours ago',
  firstLine: 'There was a man of the Pharisees named Nicodemus, a ruler of the Jews.',
  nextChapter: { bookSlug: 'john', bookName: 'John', chapter: 4 },
}

function renderCard(overrides: Partial<typeof DEFAULT_PROPS> = {}) {
  return render(
    <MemoryRouter>
      <ResumeReadingCard {...DEFAULT_PROPS} {...overrides} />
    </MemoryRouter>,
  )
}

describe('ResumeReadingCard', () => {
  it('renders book name and chapter', () => {
    renderCard()
    expect(screen.getByText('John 3')).toBeInTheDocument()
  })

  it('renders first-line preview', () => {
    renderCard()
    expect(
      screen.getByText(/There was a man of the Pharisees/),
    ).toBeInTheDocument()
  })

  it('renders relative time label', () => {
    renderCard()
    expect(screen.getByText('Read 3 hours ago')).toBeInTheDocument()
  })

  it('Continue link navigates to correct URL', () => {
    renderCard()
    const link = screen.getByRole('link', { name: /continue reading john chapter 3/i })
    expect(link.getAttribute('href')).toBe('/bible/john/3')
  })

  it('"next chapter" link visible when nextChapter provided', () => {
    renderCard()
    const link = screen.getByRole('link', { name: /or read the next chapter/i })
    expect(link).toBeInTheDocument()
    expect(link.getAttribute('href')).toBe('/bible/john/4')
  })

  it('"next chapter" link hidden when nextChapter is null', () => {
    renderCard({ nextChapter: null })
    expect(screen.queryByText(/or read the next chapter/i)).not.toBeInTheDocument()
  })

  it('has accent border', () => {
    const { container } = renderCard()
    const article = container.querySelector('article')
    expect(article?.className).toContain('border-l-primary/60')
  })

  it('"Continue" button has 44px min height', () => {
    renderCard()
    const link = screen.getByRole('link', { name: /continue reading/i })
    expect(link.className).toContain('min-h-[44px]')
  })

  it('has appropriate aria-label', () => {
    renderCard()
    expect(
      screen.getByLabelText('Continue reading John chapter 3'),
    ).toBeInTheDocument()
  })

  it('focus-visible ring on links', () => {
    renderCard()
    const continueLink = screen.getByRole('link', { name: /continue reading/i })
    expect(continueLink.className).toContain('focus-visible:ring-2')
    const nextLink = screen.getByRole('link', { name: /or read the next chapter/i })
    expect(nextLink.className).toContain('focus-visible:ring-2')
  })
})
