import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { AmbientFilterBar } from '../AmbientFilterBar'
import type { FilterState } from '@/hooks/useAmbientSearch'

const EMPTY_FILTERS: FilterState = {
  mood: [],
  activity: [],
  intensity: [],
  scriptureTheme: [],
}

const defaultProps = {
  filters: EMPTY_FILTERS,
  onToggleFilter: vi.fn(),
  activeFilterCount: 0,
  isFilterPanelOpen: false,
  onSetFilterPanelOpen: vi.fn(),
}

describe('AmbientFilterBar', () => {
  it('renders filter toggle + 4 quick chips', () => {
    render(<AmbientFilterBar {...defaultProps} />)

    expect(screen.getByLabelText('Toggle content filters')).toBeInTheDocument()
    // Quick-access chips are duplicated in the panel, so use aria-labels
    expect(screen.getByLabelText('Filter by Prayer activity')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter by Sleep activity')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter by Relaxation activity')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter by Study activity')).toBeInTheDocument()
  })

  it('filter toggle chip shows badge count', () => {
    render(<AmbientFilterBar {...defaultProps} activeFilterCount={3} />)
    expect(screen.getByText('(3)')).toBeInTheDocument()
  })

  it('clicking filter toggle opens panel', async () => {
    const user = userEvent.setup()
    const onSetOpen = vi.fn()
    render(
      <AmbientFilterBar {...defaultProps} onSetFilterPanelOpen={onSetOpen} />,
    )

    await user.click(screen.getByLabelText('Toggle content filters'))
    expect(onSetOpen).toHaveBeenCalledWith(true)
  })

  it('quick chips use aria-pressed toggle pattern', () => {
    render(<AmbientFilterBar {...defaultProps} />)

    const prayerChip = screen.getByLabelText('Filter by Prayer activity')
    expect(prayerChip).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking quick chip calls toggleFilter', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<AmbientFilterBar {...defaultProps} onToggleFilter={onToggle} />)

    await user.click(screen.getByLabelText('Filter by Prayer activity'))
    expect(onToggle).toHaveBeenCalledWith('activity', 'prayer')
  })

  it('expanded panel shows 4 dimensions', () => {
    render(<AmbientFilterBar {...defaultProps} isFilterPanelOpen={true} />)

    expect(screen.getByText('Mood')).toBeInTheDocument()
    expect(screen.getByText('Activity')).toBeInTheDocument()
    expect(screen.getByText('Intensity')).toBeInTheDocument()
    expect(screen.getByText('Scripture Theme')).toBeInTheDocument()
  })

  it('active chips show filled style', () => {
    const filters: FilterState = {
      mood: [],
      activity: ['prayer'],
      intensity: [],
      scriptureTheme: [],
    }
    render(<AmbientFilterBar {...defaultProps} filters={filters} />)

    const prayerChip = screen.getByLabelText('Filter by Prayer activity')
    expect(prayerChip.className).toContain('bg-primary')
  })

  it('filter panel has accessible region role', () => {
    render(<AmbientFilterBar {...defaultProps} isFilterPanelOpen={true} />)

    const region = screen.getByRole('region', { name: 'Content filters' })
    expect(region).toBeInTheDocument()
  })
})
