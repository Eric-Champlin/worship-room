import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ScriptureChip } from '../ScriptureChip'

describe('ScriptureChip', () => {
  it('renders reference text and link to Bible reader for ref with verse', () => {
    render(
      <MemoryRouter>
        <ScriptureChip reference="John 3:16" />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: /Read John 3:16 in the Bible/ })
    expect(link).toHaveAttribute('href', '/bible/john/3?scroll-to=16&verse=16')
  })

  it('link includes ?scroll-to=<n> alongside ?verse=<n>', () => {
    // Gate-G-SCROLL-TO-PRESENT
    render(
      <MemoryRouter>
        <ScriptureChip reference="Psalm 23:1" />
      </MemoryRouter>,
    )
    const href = screen.getByRole('link').getAttribute('href') ?? ''
    expect(href).toContain('scroll-to=1')
    expect(href).toContain('verse=1')
  })

  it('?verse= and ?scroll-to= reference the same verse number', () => {
    // Gate-G-VERSE-AND-SCROLL-TO-MATCH
    render(
      <MemoryRouter>
        <ScriptureChip reference="Romans 8:28" />
      </MemoryRouter>,
    )
    const href = screen.getByRole('link').getAttribute('href') ?? ''
    const url = new URL(href, 'http://test.invalid')
    expect(url.searchParams.get('scroll-to')).toBe('28')
    expect(url.searchParams.get('verse')).toBe('28')
    expect(url.searchParams.get('scroll-to')).toBe(url.searchParams.get('verse'))
  })

  it('range reference links to the first verse for both params', () => {
    // Gate-G-RANGE-FALLBACK
    render(
      <MemoryRouter>
        <ScriptureChip reference="Romans 8:28-30" />
      </MemoryRouter>,
    )
    const href = screen.getByRole('link').getAttribute('href') ?? ''
    expect(href).toBe('/bible/romans/8?scroll-to=28&verse=28')
  })

  it('handles chapter-only reference (no verse query param)', () => {
    render(
      <MemoryRouter>
        <ScriptureChip reference="Romans 8" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link')).toHaveAttribute('href', '/bible/romans/8')
  })

  it('renders unlinked span when reference is unparseable', () => {
    render(<ScriptureChip reference="Foo 99:99" />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Scripture reference (unlinked)')).toBeInTheDocument()
  })

  it('displays the BookOpen icon (decorative, aria-hidden)', () => {
    const { container } = render(
      <MemoryRouter>
        <ScriptureChip reference="John 3:16" />
      </MemoryRouter>,
    )
    const svg = container.querySelector('svg[aria-hidden="true"]')
    expect(svg).toBeInTheDocument()
  })

  it('applies custom className when provided', () => {
    render(
      <MemoryRouter>
        <ScriptureChip reference="John 3:16" className="ml-2" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link')).toHaveClass('ml-2')
  })

  it('chip aria-label uses the reference verbatim', () => {
    render(
      <MemoryRouter>
        <ScriptureChip reference="Psalm 23:1" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link')).toHaveAttribute(
      'aria-label',
      'Read Psalm 23:1 in the Bible',
    )
  })
})
