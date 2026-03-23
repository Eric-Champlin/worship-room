import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { CommunityFeed } from '../CommunityFeed'
import { getActivityItems } from '@/data/challenge-community-feed'

function renderFeed(dayNumber = 5, challengeDuration = 40) {
  return render(
    <MemoryRouter>
      <CommunityFeed dayNumber={dayNumber} challengeDuration={challengeDuration} />
    </MemoryRouter>,
  )
}

describe('CommunityFeed', () => {
  it('renders 6 activity items', () => {
    renderFeed()
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(6)
  })

  it('items change based on day number', () => {
    const day5Items = getActivityItems(5, 40, 6)
    const day6Items = getActivityItems(6, 40, 6)
    // At least one item should differ
    const allSame = day5Items.every((item, i) => item.name === day6Items[i].name && item.action === day6Items[i].action)
    expect(allSame).toBe(false)
  })

  it('items are deterministic (same day = same items)', () => {
    const first = getActivityItems(10, 40, 6)
    const second = getActivityItems(10, 40, 6)
    expect(first).toEqual(second)
  })

  it('activity list uses semantic ul/li', () => {
    renderFeed()
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0)
  })

  it('"Pray for the community" links to prayer wall with filter', () => {
    renderFeed()
    const link = screen.getByText('Pray for the community').closest('a')
    expect(link).toHaveAttribute('href', '/prayer-wall?filter=challenge')
  })

  it('avatar circles have distinct colors', () => {
    renderFeed()
    const items = screen.getAllByRole('listitem')
    const colors = new Set<string>()
    items.forEach((item) => {
      const avatar = item.querySelector('[aria-hidden="true"]')
      if (avatar) {
        const bg = (avatar as HTMLElement).style.backgroundColor
        if (bg) colors.add(bg)
      }
    })
    expect(colors.size).toBeGreaterThan(1)
  })
})
