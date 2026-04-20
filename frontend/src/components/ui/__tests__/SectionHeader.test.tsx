import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SectionHeader } from '../SectionHeader'

describe('SectionHeader', () => {
  it('renders h2 by default with canonical class list', () => {
    render(<SectionHeader>Featured</SectionHeader>)
    const heading = screen.getByRole('heading', { level: 2, name: /featured/i })
    expect(heading.tagName).toBe('H2')
    expect(heading.className).toContain('text-sm')
    expect(heading.className).toContain('font-semibold')
    expect(heading.className).toContain('uppercase')
    expect(heading.className).toContain('tracking-wide')
    expect(heading.className).toContain('text-white')
    expect(heading.className).not.toContain('text-white/50')
  })

  it('renders h3 when `as="h3"`', () => {
    render(<SectionHeader as="h3">Nature</SectionHeader>)
    const heading = screen.getByRole('heading', { level: 3, name: /nature/i })
    expect(heading.tagName).toBe('H3')
  })

  it('renders leading icon before the text', () => {
    render(
      <SectionHeader icon={<svg data-testid="lead-icon" aria-hidden="true" />}>
        Featured
      </SectionHeader>,
    )
    const icon = screen.getByTestId('lead-icon')
    const span = screen.getByText('Featured')
    // Ensure icon precedes the label in DOM order
    expect(
      icon.compareDocumentPosition(span) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('renders right-aligned action slot', () => {
    render(
      <SectionHeader action={<button type="button">See all</button>}>
        Featured
      </SectionHeader>,
    )
    const action = screen.getByRole('button', { name: /see all/i })
    expect(action).toBeInTheDocument()
    // Action wrapper is a sibling div after the heading
    const heading = screen.getByRole('heading', { level: 2 })
    const root = heading.parentElement as HTMLElement
    expect(root).toHaveClass('flex')
    expect(root).toHaveClass('items-center')
    expect(root).toHaveClass('justify-between')
  })

  it('accepts custom className merged onto the root', () => {
    render(<SectionHeader className="mt-6">Featured</SectionHeader>)
    const heading = screen.getByRole('heading', { level: 2 })
    const root = heading.parentElement as HTMLElement
    expect(root.className).toContain('mt-6')
    expect(root.className).toContain('mb-4')
  })

  it('passes id prop to the heading element for aria-labelledby wiring', () => {
    render(<SectionHeader id="category-nature">Nature</SectionHeader>)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveAttribute('id', 'category-nature')
  })

  it('does not render an action wrapper when no action is provided', () => {
    const { container } = render(<SectionHeader>Featured</SectionHeader>)
    const root = container.firstElementChild as HTMLElement
    // Root should contain exactly one child element (the heading)
    expect(root.children).toHaveLength(1)
    expect(root.children[0].tagName).toBe('H2')
  })

  it('renders gradient variant centered with inline gradient style', () => {
    render(<SectionHeader variant="gradient">Featured</SectionHeader>)
    const heading = screen.getByRole('heading', { level: 2, name: /featured/i })
    expect(heading.className).toContain('text-center')
    expect(heading.className).toContain('text-3xl')
    expect(heading.className).toContain('sm:text-4xl')
    expect(heading.className).toContain('lg:text-5xl')
    expect(heading.className).toContain('font-bold')
    expect(heading.className).toContain('leading-tight')
    // Inline gradient style is applied directly on the heading element.
    expect(heading.style.backgroundImage).not.toBe('')
  })

  it('renders gradient variant without wrapper div', () => {
    render(<SectionHeader variant="gradient">Featured</SectionHeader>)
    const heading = screen.getByRole('heading', { level: 2 })
    const parent = heading.parentElement as HTMLElement
    // Parent must NOT be the default variant's flex wrapper — it should be the
    // render container (RTL's test wrapper div), which does not carry the
    // default variant's flex classes.
    expect(parent.className).not.toContain('flex')
    expect(parent.className).not.toContain('justify-between')
  })

  it('silently ignores icon and action on gradient variant', () => {
    render(
      <SectionHeader
        variant="gradient"
        icon={<svg data-testid="ignored-icon" aria-hidden="true" />}
        action={<button type="button">Ignored</button>}
      >
        Featured
      </SectionHeader>,
    )
    expect(screen.queryByTestId('ignored-icon')).toBeNull()
    expect(screen.queryByRole('button', { name: /ignored/i })).toBeNull()
  })
})
