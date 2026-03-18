import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BoardSelector } from '../BoardSelector'

describe('BoardSelector', () => {
  it('renders two segments', () => {
    render(<BoardSelector activeBoard="friends" onBoardChange={() => {}} />)
    expect(screen.getByRole('tab', { name: 'Friends' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Global' })).toBeInTheDocument()
  })

  it('active segment has bg-primary class', () => {
    render(<BoardSelector activeBoard="friends" onBoardChange={() => {}} />)
    const friendsTab = screen.getByRole('tab', { name: 'Friends' })
    expect(friendsTab.className).toContain('bg-primary')
    const globalTab = screen.getByRole('tab', { name: 'Global' })
    expect(globalTab.className).not.toContain('bg-primary')
  })

  it('calls onBoardChange on click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BoardSelector activeBoard="friends" onBoardChange={onChange} />)
    await user.click(screen.getByRole('tab', { name: 'Global' }))
    expect(onChange).toHaveBeenCalledWith('global')
  })

  it('uses accessible tablist pattern', () => {
    render(<BoardSelector activeBoard="friends" onBoardChange={() => {}} />)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(2)
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false')
  })
})
