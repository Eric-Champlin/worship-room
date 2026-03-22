import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoryFilterBar } from '../CategoryFilterBar'
import { PRAYER_CATEGORIES, type PrayerCategory } from '@/constants/prayer-categories'

const zeroCounts: Record<PrayerCategory, number> = {
  health: 2, family: 2, work: 3, grief: 1,
  gratitude: 3, praise: 2, relationships: 2, other: 3, discussion: 0,
}

function renderBar(overrides?: {
  activeCategory?: PrayerCategory | null
  showCounts?: boolean
  onSelectCategory?: (cat: PrayerCategory | null) => void
}) {
  return render(
    <CategoryFilterBar
      activeCategory={overrides?.activeCategory ?? null}
      onSelectCategory={overrides?.onSelectCategory ?? vi.fn()}
      categoryCounts={zeroCounts}
      showCounts={overrides?.showCounts ?? false}
    />,
  )
}

describe('CategoryFilterBar', () => {
  it('renders "All" pill and 9 category pills', () => {
    renderBar()
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(10) // "All" + 9 categories
    expect(screen.getByText('All')).toBeInTheDocument()
    for (const cat of PRAYER_CATEGORIES) {
      expect(screen.getByText(cat.charAt(0).toUpperCase() + cat.slice(1))).toBeInTheDocument()
    }
  })

  it('"All" is selected by default (no active category)', () => {
    renderBar()
    expect(screen.getByText('All')).toHaveAttribute('aria-pressed', 'true')
  })

  it('clicking a category pill calls onSelectCategory', async () => {
    const user = userEvent.setup()
    const onSelectCategory = vi.fn()
    renderBar({ onSelectCategory })
    await user.click(screen.getByText('Health'))
    expect(onSelectCategory).toHaveBeenCalledWith('health')
  })

  it('clicking "All" calls onSelectCategory(null)', async () => {
    const user = userEvent.setup()
    const onSelectCategory = vi.fn()
    renderBar({ activeCategory: 'health', onSelectCategory })
    await user.click(screen.getByText('All'))
    expect(onSelectCategory).toHaveBeenCalledWith(null)
  })

  it('active pill has selected styling', () => {
    renderBar({ activeCategory: 'health' })
    const healthPill = screen.getByText('Health')
    expect(healthPill.className).toContain('bg-primary/20')
    expect(healthPill).toHaveAttribute('aria-pressed', 'true')
  })

  it('counts shown when showCounts is true', () => {
    renderBar({ showCounts: true, activeCategory: 'health' })
    expect(screen.getByText('Health (2)')).toBeInTheDocument()
    expect(screen.getByText('Work (3)')).toBeInTheDocument()
  })

  it('counts NOT shown when showCounts is false', () => {
    renderBar({ showCounts: false })
    expect(screen.getByText('Health')).toBeInTheDocument()
    expect(screen.queryByText('Health (2)')).not.toBeInTheDocument()
  })

  it('filter bar has toolbar role', () => {
    renderBar()
    expect(screen.getByRole('toolbar', { name: /filter prayers by category/i })).toBeInTheDocument()
  })

  it('pills are keyboard-navigable', async () => {
    const user = userEvent.setup()
    const onSelectCategory = vi.fn()
    renderBar({ onSelectCategory })
    const allBtn = screen.getByText('All')
    allBtn.focus()
    await user.keyboard('{Enter}')
    expect(onSelectCategory).toHaveBeenCalledWith(null)
  })
})
