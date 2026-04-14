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
})
