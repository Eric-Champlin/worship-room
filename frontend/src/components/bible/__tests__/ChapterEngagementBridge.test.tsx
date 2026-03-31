import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { ChapterEngagementBridge } from '../ChapterEngagementBridge'

function renderBridge(
  props: Partial<React.ComponentProps<typeof ChapterEngagementBridge>> = {},
) {
  const defaultProps = {
    bookName: 'Genesis',
    chapterNumber: 1,
    ...props,
  }
  return render(
    <MemoryRouter>
      <ChapterEngagementBridge {...defaultProps} />
    </MemoryRouter>,
  )
}

describe('ChapterEngagementBridge', () => {
  it('renders heading with correct book name and chapter', () => {
    renderBridge({ bookName: 'Genesis', chapterNumber: 1 })
    expect(
      screen.getByText('Continue your time with Genesis 1'),
    ).toBeInTheDocument()
  })

  it('renders heading with singular "Psalm" for Psalms book', () => {
    renderBridge({ bookName: 'Psalms', chapterNumber: 23 })
    expect(
      screen.getByText('Continue your time with Psalm 23'),
    ).toBeInTheDocument()
  })

  it('renders heading with numbered books correctly', () => {
    renderBridge({ bookName: '1 Samuel', chapterNumber: 3 })
    expect(
      screen.getByText('Continue your time with 1 Samuel 3'),
    ).toBeInTheDocument()
  })

  it('renders four CTA buttons with correct labels', () => {
    renderBridge()
    expect(screen.getByRole('link', { name: /Journal/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pray/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ask/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Meditate/ })).toBeInTheDocument()
  })

  it('Journal button links to correct URL with prompt param', () => {
    renderBridge({ bookName: 'Genesis', chapterNumber: 1 })
    const link = screen.getByRole('link', { name: /Journal/ })
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('/daily?tab=journal&prompt='),
    )
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining(
        encodeURIComponent(
          'Journal about what stood out to you in Genesis 1',
        ),
      ),
    )
  })

  it('Pray button links to correct URL with context param', () => {
    renderBridge({ bookName: 'Genesis', chapterNumber: 1 })
    const link = screen.getByRole('link', { name: /Pray/ })
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('/daily?tab=pray&context='),
    )
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining(
        encodeURIComponent('Pray about what you read in Genesis 1'),
      ),
    )
  })

  it('Ask button links to correct URL with q param', () => {
    renderBridge({ bookName: 'Genesis', chapterNumber: 1 })
    const link = screen.getByRole('link', { name: /Ask/ })
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('/ask?q='),
    )
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining(
        encodeURIComponent(
          'What does Genesis 1 mean and how can I apply it to my life?',
        ),
      ),
    )
  })

  it('Meditate button links to correct URL', () => {
    renderBridge()
    const link = screen.getByRole('link', { name: /Meditate/ })
    expect(link).toHaveAttribute('href', '/daily?tab=meditate')
  })

  it('renders Lucide icons for all four buttons', () => {
    renderBridge()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(4)
    // Each link should contain an SVG icon (aria-hidden)
    for (const link of links) {
      const svg = link.querySelector('svg')
      expect(svg).toBeInTheDocument()
    }
  })

  it('all buttons have min-h-[44px] for touch targets', () => {
    renderBridge()
    const links = screen.getAllByRole('link')
    for (const link of links) {
      expect(link.className).toContain('min-h-[44px]')
    }
  })
})
