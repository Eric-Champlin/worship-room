import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoryFilterBar } from '../CategoryFilterBar'
import { type PrayerCategory } from '@/constants/prayer-categories'

const zeroCounts: Record<PrayerCategory, number> = {
  health: 2, 'mental-health': 0, family: 2, work: 3, grief: 1,
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
  it('renders "All" pill and 10 category pills', () => {
    renderBar()
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(11) // "All" + 10 categories
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Mental Health')).toBeInTheDocument()
  })

  it('"Mental Health" pill renders between Health and Family', () => {
    renderBar()
    const buttons = screen.getAllByRole('button')
    const labels = buttons.map((b) => b.textContent)
    const healthIdx = labels.indexOf('Health')
    const mentalHealthIdx = labels.indexOf('Mental Health')
    const familyIdx = labels.indexOf('Family')
    expect(mentalHealthIdx).toBe(healthIdx + 1)
    expect(familyIdx).toBe(mentalHealthIdx + 1)
  })

  it('scroll container has flex-nowrap and no lg:flex-wrap', () => {
    renderBar()
    const toolbar = screen.getByRole('toolbar')
    const scrollContainer = toolbar.querySelector('.flex-nowrap')
    expect(scrollContainer).not.toBeNull()
    expect(scrollContainer?.className).not.toContain('lg:flex-wrap')
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

  it('count shown only on the active pill when showCounts is true', () => {
    renderBar({ showCounts: true, activeCategory: 'health' })
    expect(screen.getByText('Health (2)')).toBeInTheDocument()
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.queryByText('Work (3)')).not.toBeInTheDocument()
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
