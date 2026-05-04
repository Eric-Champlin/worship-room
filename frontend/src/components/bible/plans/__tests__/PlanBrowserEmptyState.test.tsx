import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PlanBrowserEmptyState } from '../PlanBrowserEmptyState'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PlanBrowserEmptyState', () => {
  it('no-manifest: renders heading and CTA', () => {
    render(
      <MemoryRouter>
        <PlanBrowserEmptyState variant="no-manifest" />
      </MemoryRouter>,
    )
    expect(screen.getByText('No plans available yet')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Open Bible/i })
    expect(link).toHaveAttribute('href', '/bible')
  })

  it('filtered-out: renders heading and clear button', () => {
    const onClear = vi.fn()
    render(<PlanBrowserEmptyState variant="filtered-out" onClearFilters={onClear} />)
    expect(screen.getByText('No plans match these filters')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Clear filters/i })).toBeInTheDocument()
  })

  it('filtered-out: clear button calls onClearFilters', async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()
    render(<PlanBrowserEmptyState variant="filtered-out" onClearFilters={onClear} />)
    await user.click(screen.getByRole('button', { name: /Clear filters/i }))
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('all-started: renders inline note', () => {
    render(<PlanBrowserEmptyState variant="all-started" />)
    expect(screen.getByText(/You've started every plan/)).toBeInTheDocument()
  })

  it('all-started: stays as plain <p> (NOT promoted to FrostedCard)', () => {
    const { container } = render(<PlanBrowserEmptyState variant="all-started" />)
    // Just a single paragraph at the root, no FrostedCard chrome
    expect(container.querySelector('p')).toBeInTheDocument()
    expect(container.querySelector('.rounded-3xl')).toBeNull()
    expect(container.querySelector('.shadow-frosted-base')).toBeNull()
  })

  it('no-manifest: wrapped in FrostedCard subdued chrome', () => {
    const { container } = render(
      <MemoryRouter>
        <PlanBrowserEmptyState variant="no-manifest" />
      </MemoryRouter>,
    )
    // Subdued variant base classes per FrostedCard.tsx VARIANT_CLASSES.subdued
    const card = container.firstElementChild as HTMLElement
    expect(card.className).toContain('rounded-3xl')
    expect(card.className).toContain('border-white/[0.10]')
    expect(card.className).toContain('text-center')
    expect(card.className).toContain('p-8')
  })

  it('no-manifest: BookOpen icon at /40 opacity (per spec)', () => {
    const { container } = render(
      <MemoryRouter>
        <PlanBrowserEmptyState variant="no-manifest" />
      </MemoryRouter>,
    )
    const icon = container.querySelector('svg.text-white\\/40')
    expect(icon).not.toBeNull()
  })

  it('no-manifest: CTA is Button subtle wrapping Link (asChild pattern)', () => {
    render(
      <MemoryRouter>
        <PlanBrowserEmptyState variant="no-manifest" />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: /Open Bible/i })
    // asChild merges Button styles onto the Link element itself; verify subtle classes are present
    expect(link.className).toContain('bg-white/[0.07]')
    expect(link.className).toContain('border-white/[0.12]')
    expect(link.className).toContain('rounded-full')
  })

  it('filtered-out: wrapped in FrostedCard subdued with col-span-full', () => {
    const onClear = vi.fn()
    const { container } = render(
      <PlanBrowserEmptyState variant="filtered-out" onClearFilters={onClear} />,
    )
    const card = container.firstElementChild as HTMLElement
    expect(card.className).toContain('rounded-3xl')
    expect(card.className).toContain('border-white/[0.10]')
    expect(card.className).toContain('col-span-full')
  })

  it('filtered-out: Clear filters CTA is Button subtle', () => {
    const onClear = vi.fn()
    render(<PlanBrowserEmptyState variant="filtered-out" onClearFilters={onClear} />)
    const btn = screen.getByRole('button', { name: /Clear filters/i })
    expect(btn.className).toContain('bg-white/[0.07]')
    expect(btn.className).toContain('border-white/[0.12]')
    expect(btn.className).toContain('rounded-full')
  })
})
