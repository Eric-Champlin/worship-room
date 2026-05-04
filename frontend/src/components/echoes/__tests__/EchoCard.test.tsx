import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import type { Echo } from '@/types/echoes'

import { EchoCard } from '../EchoCard'

function makeEcho(overrides: Partial<Echo> = {}): Echo {
  return {
    id: 'echo:highlighted:john:3:16-16',
    kind: 'highlighted',
    book: 'john',
    bookName: 'John',
    chapter: 3,
    startVerse: 16,
    endVerse: 16,
    text: 'For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.',
    reference: 'John 3:16',
    relativeLabel: 'a month ago',
    occurredAt: Date.now() - 30 * 86_400_000,
    score: 120,
    ...overrides,
  }
}

function renderCard(echo: Echo, onNavigate?: () => void) {
  return render(
    <MemoryRouter>
      <EchoCard echo={echo} onNavigate={onNavigate} />
    </MemoryRouter>,
  )
}

describe('EchoCard', () => {
  it('renders label with kind and relative label', () => {
    renderCard(makeEcho())
    expect(screen.getByText('You highlighted this a month ago')).toBeInTheDocument()
  })

  it('renders verse text in serif font', () => {
    renderCard(makeEcho())
    const verseEl = screen.getByText(/For God so loved the world/)
    expect(verseEl.className).toContain('font-serif')
  })

  it('renders reference right-aligned', () => {
    renderCard(makeEcho())
    const refEl = screen.getByText(/John 3:16/)
    expect(refEl.className).toContain('text-right')
  })

  it('shows Highlighter icon for highlighted kind', () => {
    const { container } = renderCard(makeEcho({ kind: 'highlighted' }))
    // Lucide renders an SVG — check for the icon wrapper
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('shows Bookmark icon for memorized kind', () => {
    const { container } = renderCard(
      makeEcho({ kind: 'memorized' }),
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('shows Calendar icon for read-on-this-day kind', () => {
    const { container } = renderCard(
      makeEcho({ kind: 'read-on-this-day' }),
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('links to correct deep link URL with verse param', () => {
    renderCard(makeEcho({ book: 'john', chapter: 3, startVerse: 16 }))
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/bible/john/3?verse=16')
  })

  it('chapter-level link omits verse param', () => {
    renderCard(
      makeEcho({
        kind: 'read-on-this-day',
        book: 'john',
        chapter: 3,
        startVerse: 0,
        endVerse: 0,
      }),
    )
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/bible/john/3')
  })

  it('calls onNavigate on click', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    renderCard(makeEcho(), onNavigate)
    await user.click(screen.getByRole('link'))
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  it('has correct aria-label', () => {
    renderCard(makeEcho({ kind: 'highlighted', reference: 'John 3:16', relativeLabel: 'a month ago' }))
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute(
      'aria-label',
      'Echo: you highlighted John 3:16 a month ago. Tap to open.',
    )
  })

  it('hides verse text when empty', () => {
    renderCard(
      makeEcho({
        kind: 'read-on-this-day',
        text: '',
        startVerse: 0,
        endVerse: 0,
      }),
    )
    // Should NOT have a serif paragraph
    const serifs = document.querySelectorAll('.font-serif')
    expect(serifs).toHaveLength(0)
  })

  it('renders FrostedCard chrome on the inner article', () => {
    renderCard(makeEcho())
    const article = screen.getByRole('article')
    expect(article.className).toContain('rounded-3xl')
    expect(article.className).toContain('border-white/[0.12]')
    expect(article.className).toContain('shadow-frosted-base')
  })

  it('applies group-hover lift on the inner article', () => {
    renderCard(makeEcho())
    const article = screen.getByRole('article')
    expect(article.className).toContain('group-hover:bg-white/[0.10]')
    expect(article.className).toContain('group-hover:-translate-y-0.5')
  })

  it('outer Link uses group + focus-ring classes', () => {
    renderCard(makeEcho())
    const link = screen.getByRole('link')
    expect(link.className).toContain('group')
    expect(link.className).toContain('focus-visible:ring-2')
  })
})
