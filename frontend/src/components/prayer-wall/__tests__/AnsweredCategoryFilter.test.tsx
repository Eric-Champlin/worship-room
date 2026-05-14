import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { AnsweredCategoryFilter } from '../AnsweredCategoryFilter'

/**
 * Spec 6.6b — AnsweredCategoryFilter unit tests.
 *
 * Covers T10 (exactly six chips + Mental Health omission),
 * T11 (URL sync via ?category= query param + "All" clears the param),
 * T12 (aria-checked reflects active state).
 */

// Helper component to expose the current URL search string for assertion.
function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location-probe">{location.search}</div>
}

function renderWithRouter(initialEntries: string[] = ['/prayer-wall/answered']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AnsweredCategoryFilter />
      <LocationProbe />
    </MemoryRouter>,
  )
}

describe('AnsweredCategoryFilter', () => {
  // ─── T10 — exactly six chips, no Mental Health ───────────────────────────

  it('renders exactly six chips with the canonical labels', () => {
    renderWithRouter()
    const chips = screen.getAllByRole('radio')
    expect(chips).toHaveLength(6)
    expect(chips.map((c) => c.textContent?.trim())).toEqual([
      'All',
      'Health',
      'Family',
      'Work',
      'Grief',
      'Gratitude',
    ])
  })

  it('does NOT render a Mental Health chip (Gate-G-MH-OMISSION)', () => {
    renderWithRouter()
    expect(
      screen.queryByRole('radio', { name: /mental health/i }),
    ).not.toBeInTheDocument()
  })

  // ─── T11 — URL sync via ?category= query param ───────────────────────────

  it('updates ?category= when a chip is selected', async () => {
    const user = userEvent.setup()
    renderWithRouter()
    await user.click(screen.getByRole('radio', { name: 'Health' }))
    expect(screen.getByTestId('location-probe').textContent).toBe('?category=health')
  })

  it('clears ?category= when All is selected', async () => {
    const user = userEvent.setup()
    renderWithRouter(['/prayer-wall/answered?category=health'])
    // sanity: starting state has the query param
    expect(screen.getByTestId('location-probe').textContent).toBe('?category=health')
    await user.click(screen.getByRole('radio', { name: 'All' }))
    // After clicking All, the query param should be cleared.
    expect(screen.getByTestId('location-probe').textContent).toBe('')
  })

  // ─── T12 — aria-checked reflects active state ────────────────────────────

  it('defaults to All checked when no category param is present', () => {
    renderWithRouter()
    expect(screen.getByRole('radio', { name: 'All' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('radio', { name: 'Health' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('reflects the active chip via aria-checked when ?category= is present', () => {
    renderWithRouter(['/prayer-wall/answered?category=family'])
    expect(screen.getByRole('radio', { name: 'Family' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('radio', { name: 'All' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('flips aria-checked when the user selects a different chip', async () => {
    const user = userEvent.setup()
    renderWithRouter()
    await user.click(screen.getByRole('radio', { name: 'Grief' }))
    expect(screen.getByRole('radio', { name: 'Grief' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('radio', { name: 'All' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })
})
