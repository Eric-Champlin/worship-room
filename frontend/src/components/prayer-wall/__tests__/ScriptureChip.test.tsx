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
    expect(link).toHaveAttribute('href', '/bible/john/3?verse=16')
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
