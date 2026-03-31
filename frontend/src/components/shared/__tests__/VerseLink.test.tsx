import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { VerseLink } from '../VerseLink'

function renderVerseLink(props: { reference: string; className?: string; children?: React.ReactNode }) {
  return render(
    <MemoryRouter>
      <VerseLink {...props} />
    </MemoryRouter>,
  )
}

describe('VerseLink', () => {
  it('renders link for valid single verse', () => {
    renderVerseLink({ reference: 'John 3:16' })
    const link = screen.getByRole('link', { name: 'John 3:16' })
    expect(link).toHaveAttribute('href', '/bible/john/3#verse-16')
  })

  it('renders link for verse range', () => {
    renderVerseLink({ reference: 'Romans 8:28-30' })
    const link = screen.getByRole('link', { name: 'Romans 8:28-30' })
    expect(link).toHaveAttribute('href', '/bible/romans/8#verse-28')
  })

  it('renders link for numbered book', () => {
    renderVerseLink({ reference: '1 Corinthians 13:4' })
    const link = screen.getByRole('link', { name: '1 Corinthians 13:4' })
    expect(link).toHaveAttribute('href', '/bible/1-corinthians/13#verse-4')
  })

  it('renders plain text for unparseable reference', () => {
    renderVerseLink({ reference: 'unknown' })
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('unknown')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    renderVerseLink({ reference: 'Psalm 34:18', className: 'text-white/60' })
    const link = screen.getByRole('link', { name: 'Psalm 34:18' })
    expect(link.className).toContain('text-white/60')
  })

  it('always has hover styles', () => {
    renderVerseLink({ reference: 'Psalm 34:18' })
    const link = screen.getByRole('link', { name: 'Psalm 34:18' })
    expect(link.className).toContain('hover:text-primary')
    expect(link.className).toContain('hover:underline')
  })

  it('LinkedAnswerText re-export works', async () => {
    const { LinkedAnswerText } = await import('@/components/ask/LinkedAnswerText')
    const { container } = render(
      <MemoryRouter>
        <LinkedAnswerText text="See Romans 8:28 for details." />
      </MemoryRouter>,
    )
    expect(container.querySelector('a')).toHaveAttribute('href', '/bible/romans/8#verse-28')
  })
})
