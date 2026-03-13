import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecentlyAddedSection } from '../RecentlyAddedSection'

describe('RecentlyAddedSection', () => {
  it('returns null when empty', () => {
    const { container } = render(<RecentlyAddedSection />)
    expect(container.innerHTML).toBe('')
  })

  it('returns null when all content is new (no older items)', () => {
    const now = new Date()
    const items = [
      { id: '1', title: 'Item 1', addedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) },
      { id: '2', title: 'Item 2', addedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) },
    ]
    const { container } = render(<RecentlyAddedSection items={items} />)
    expect(container.innerHTML).toBe('')
  })

  it('shows "New" badge for items added within 14 days', () => {
    const now = new Date()
    const items = [
      { id: '1', title: 'Recent Item', addedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) },
      { id: '2', title: 'Older Item', addedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000) },
      { id: '3', title: 'Ancient Item', addedAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000) },
    ]
    render(<RecentlyAddedSection items={items} />)
    expect(screen.getByText('Recent Item')).toBeInTheDocument()
    expect(screen.getByText('New')).toBeInTheDocument()
    // Older item (20 days, within 30) should appear but without New badge
    expect(screen.getByText('Older Item')).toBeInTheDocument()
  })

  it('has correct aria-label', () => {
    const now = new Date()
    const items = [
      { id: '1', title: 'New', addedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) },
      { id: '2', title: 'Old', addedAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000) },
    ]
    render(<RecentlyAddedSection items={items} />)
    expect(
      screen.getByLabelText('Recently added content'),
    ).toBeInTheDocument()
  })
})
