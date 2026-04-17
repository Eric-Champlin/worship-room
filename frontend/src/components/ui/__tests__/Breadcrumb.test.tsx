import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Breadcrumb } from '../Breadcrumb'

function renderBreadcrumb(
  items: Array<{ label: string; href?: string }>,
  maxWidth?: string
) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Breadcrumb items={items} maxWidth={maxWidth} />
    </MemoryRouter>
  )
}

describe('Breadcrumb', () => {
  it('renders nav with aria-label', () => {
    renderBreadcrumb([
      { label: 'Home', href: '/' },
      { label: 'Current' },
    ])
    expect(
      screen.getByRole('navigation', { name: /breadcrumb/i })
    ).toBeInTheDocument()
  })

  it('renders ol with li items', () => {
    renderBreadcrumb([
      { label: 'Home', href: '/' },
      { label: 'Parent', href: '/parent' },
      { label: 'Current' },
    ])
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
    const list = nav.querySelector('ol')
    expect(list).toBeInTheDocument()
    // 3 items + 1 ellipsis li = 4 li elements
    const listItems = list!.querySelectorAll(':scope > li')
    expect(listItems.length).toBe(4)
  })

  it('parent items are links', () => {
    renderBreadcrumb([
      { label: 'Study Bible', href: '/bible' },
      { label: 'Genesis', href: '/bible?book=genesis' },
      { label: 'Chapter 1' },
    ])
    const bibleLink = screen.getByRole('link', { name: 'Study Bible' })
    expect(bibleLink).toHaveAttribute('href', '/bible')
    const genesisLink = screen.getByRole('link', { name: 'Genesis' })
    expect(genesisLink).toHaveAttribute('href', '/bible?book=genesis')
  })

  it('last item has aria-current and no link', () => {
    renderBreadcrumb([
      { label: 'Study Bible', href: '/bible' },
      { label: 'Chapter 1' },
    ])
    const current = screen.getByText('Chapter 1')
    expect(current).toHaveAttribute('aria-current', 'page')
    expect(current.tagName).toBe('SPAN')
  })

  it('separators are aria-hidden', () => {
    renderBreadcrumb([
      { label: 'Home', href: '/' },
      { label: 'Parent', href: '/parent' },
      { label: 'Current' },
    ])
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
    const svgs = nav.querySelectorAll('svg')
    svgs.forEach((svg) => {
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })
  })

  it('mobile truncation for 3+ items shows ellipsis and hides early items', () => {
    renderBreadcrumb([
      { label: 'Study Bible', href: '/bible' },
      { label: 'Genesis', href: '/bible?book=genesis' },
      { label: 'Chapter 1' },
    ])
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i })

    // Ellipsis li exists with sm:hidden class (visible only on mobile)
    const ellipsisLi = nav.querySelector('li[aria-hidden="true"]')
    expect(ellipsisLi).toBeInTheDocument()
    expect(ellipsisLi!.className).toContain('sm:hidden')

    // First item li has hidden sm:flex (hidden on mobile)
    const bibleLink = screen.getByRole('link', { name: 'Study Bible' })
    const bibleLi = bibleLink.closest('li')
    expect(bibleLi!.className).toContain('hidden')
    expect(bibleLi!.className).toContain('sm:flex')
  })

  it('full trail for 2 items — no ellipsis', () => {
    renderBreadcrumb([
      { label: 'Prayer Wall', href: '/prayer-wall' },
      { label: 'My Dashboard' },
    ])
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i })

    // No ellipsis li
    const ellipsisLi = nav.querySelector('li[aria-hidden="true"]')
    expect(ellipsisLi).not.toBeInTheDocument()

    // Both items visible (no hidden class)
    const link = screen.getByRole('link', { name: 'Prayer Wall' })
    const linkLi = link.closest('li')
    expect(linkLi!.className).not.toContain('hidden')
  })

  it('applies maxWidth prop', () => {
    const { container } = renderBreadcrumb(
      [{ label: 'Home', href: '/' }, { label: 'Current' }],
      'max-w-4xl'
    )
    const innerDiv = container.querySelector('nav > div')
    expect(innerDiv!.className).toContain('max-w-4xl')
  })

  it('focus indicators on links', () => {
    renderBreadcrumb([
      { label: 'Home', href: '/' },
      { label: 'Current' },
    ])
    const link = screen.getByRole('link', { name: 'Home' })
    expect(link.className).toContain('focus-visible:ring-2')
    expect(link.className).toContain('focus-visible:ring-primary')
  })

  it('returns null for empty items', () => {
    const { container } = renderBreadcrumb([])
    expect(container.querySelector('nav')).not.toBeInTheDocument()
  })
})
