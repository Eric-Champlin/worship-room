import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PrayerListActionBar } from '../PrayerListActionBar'

const defaultProps = {
  filter: 'active' as const,
  onFilterChange: vi.fn(),
  counts: { all: 10, active: 7, answered: 3 },
  onAddPrayer: vi.fn(),
}

function renderBar(overrides = {}) {
  return render(<PrayerListActionBar {...defaultProps} {...overrides} />)
}

describe('PrayerListActionBar', () => {
  it('renders "Add Prayer" button with Plus icon', () => {
    renderBar()
    const button = screen.getByText('Add Prayer')
    expect(button).toBeInTheDocument()
  })

  it('renders filter pills with correct counts', () => {
    renderBar()
    expect(screen.getByText('All (10)')).toBeInTheDocument()
    expect(screen.getByText('Active (7)')).toBeInTheDocument()
    expect(screen.getByText('Answered (3)')).toBeInTheDocument()
  })

  it('"Active" filter is selected by default', () => {
    renderBar()
    const activePill = screen.getByText('Active (7)')
    expect(activePill).toHaveAttribute('aria-checked', 'true')

    const allPill = screen.getByText('All (10)')
    expect(allPill).toHaveAttribute('aria-checked', 'false')
  })

  it('clicking a filter pill calls onFilterChange', async () => {
    const onFilterChange = vi.fn()
    const user = userEvent.setup()
    renderBar({ onFilterChange })

    await user.click(screen.getByText('Answered (3)'))
    expect(onFilterChange).toHaveBeenCalledWith('answered')
  })

  it('action bar has correct ARIA roles', () => {
    renderBar()
    const radiogroup = screen.getByRole('radiogroup')
    expect(radiogroup).toHaveAttribute('aria-label', 'Filter prayers')

    const radios = within(radiogroup).getAllByRole('radio')
    expect(radios).toHaveLength(3)
  })
})
