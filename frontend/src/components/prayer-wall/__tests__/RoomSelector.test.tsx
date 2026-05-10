import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RoomSelector } from '../RoomSelector'
import type { PostType } from '@/constants/post-types'

function renderBar(overrides?: {
  activePostType?: PostType | null
  onSelectPostType?: (postType: PostType | null) => void
}) {
  return render(
    <RoomSelector
      activePostType={overrides?.activePostType ?? null}
      onSelectPostType={overrides?.onSelectPostType ?? vi.fn()}
    />,
  )
}

describe('RoomSelector', () => {
  it('renders 6 pills in canonical order: All, Prayer requests, Testimonies, Questions, Discussions, Encouragements', () => {
    renderBar()
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(6)
    const labels = buttons.map((b) => b.textContent)
    expect(labels).toEqual([
      'All',
      'Prayer requests',
      'Testimonies',
      'Questions',
      'Discussions',
      'Encouragements',
    ])
  })

  it('default state — All pill is active when activePostType is null', () => {
    renderBar()
    expect(screen.getByText('All')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Testimonies')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('Encouragements')).toHaveAttribute('aria-pressed', 'false')
  })

  it('selected pill carries the per-type accent classes (testimony → amber)', () => {
    renderBar({ activePostType: 'testimony' })
    const testimonies = screen.getByText('Testimonies')
    expect(testimonies.className).toContain('bg-amber-500/20')
    expect(testimonies.className).toContain('text-amber-100')
    // All pill is now inactive — should carry inactive base classes, not the active 'all' accent.
    const all = screen.getByText('All')
    expect(all.className).toContain('bg-white/10')
    expect(all).toHaveAttribute('aria-pressed', 'false')
  })

  it('every pill has a 44px touch target (min-h-[44px]) and shrink-0', () => {
    renderBar()
    const buttons = screen.getAllByRole('button')
    for (const button of buttons) {
      expect(button.className).toContain('min-h-[44px]')
      expect(button.className).toContain('shrink-0')
    }
  })

  it('aria-pressed reflects active prop on rerender', () => {
    const { rerender } = renderBar({ activePostType: null })
    expect(screen.getByText('Encouragements')).toHaveAttribute('aria-pressed', 'false')
    rerender(<RoomSelector activePostType="encouragement" onSelectPostType={vi.fn()} />)
    expect(screen.getByText('Encouragements')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('All')).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking a non-All pill calls onSelectPostType with the correct PostType id', async () => {
    const user = userEvent.setup()
    const onSelectPostType = vi.fn()
    renderBar({ onSelectPostType })
    await user.click(screen.getByText('Testimonies'))
    expect(onSelectPostType).toHaveBeenCalledWith('testimony')
  })

  it('clicking the All pill calls onSelectPostType with null', async () => {
    const user = userEvent.setup()
    const onSelectPostType = vi.fn()
    renderBar({ activePostType: 'testimony', onSelectPostType })
    await user.click(screen.getByText('All'))
    expect(onSelectPostType).toHaveBeenCalledWith(null)
  })

  it('Tab key cycles through all 6 pills in DOM order', async () => {
    const user = userEvent.setup()
    renderBar()
    const buttons = screen.getAllByRole('button')
    // Tab focuses the first focusable element first.
    await user.tab()
    expect(document.activeElement).toBe(buttons[0])
    for (let i = 1; i < buttons.length; i++) {
      await user.tab()
      expect(document.activeElement).toBe(buttons[i])
    }
  })

  it('Enter and Space activate the focused pill', async () => {
    const user = userEvent.setup()
    const onSelectPostType = vi.fn()
    renderBar({ onSelectPostType })
    const questions = screen.getByText('Questions')
    questions.focus()
    await user.keyboard('{Enter}')
    expect(onSelectPostType).toHaveBeenCalledWith('question')
    onSelectPostType.mockClear()
    questions.focus()
    await user.keyboard(' ')
    expect(onSelectPostType).toHaveBeenCalledWith('question')
  })

  it('container has role="toolbar" and aria-label="Filter by post type"', () => {
    renderBar()
    expect(
      screen.getByRole('toolbar', { name: /filter by post type/i }),
    ).toBeInTheDocument()
  })
})
