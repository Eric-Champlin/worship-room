import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CategoryFilterBar } from '../CategoryFilterBar'
import { PRAYER_CATEGORIES, type PrayerCategory } from '@/constants/prayer-categories'

const defaultCounts = Object.fromEntries(
  PRAYER_CATEGORIES.map(cat => [cat, 0]),
) as Record<PrayerCategory, number>

function renderBar(activeCategory: PrayerCategory | null = null) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CategoryFilterBar
        activeCategory={activeCategory}
        onSelectCategory={vi.fn()}
        categoryCounts={defaultCounts}
        showCounts={false}
      />
    </MemoryRouter>,
  )
}

describe('Discussion category in filter bar', () => {
  it('"Discussion" pill renders in filter bar', () => {
    renderBar()
    expect(screen.getByText('Discussion')).toBeInTheDocument()
  })

  it('"Discussion" pill is after "Other" in DOM order', () => {
    renderBar()
    const buttons = screen.getAllByRole('button')
    const otherIdx = buttons.findIndex(b => b.textContent === 'Other')
    const discussionIdx = buttons.findIndex(b => b.textContent === 'Discussion')
    expect(discussionIdx).toBeGreaterThan(otherIdx)
  })

  it('Discussion pill can be selected', () => {
    renderBar('discussion')
    const discussionBtn = screen.getByText('Discussion')
    expect(discussionBtn.closest('button')).toHaveAttribute('aria-pressed', 'true')
  })
})
