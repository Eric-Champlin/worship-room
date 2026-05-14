import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommunityGuidelinesCard } from '../CommunityGuidelinesCard'

const STORAGE_KEY = 'wr_prayer_wall_guidelines_dismissed'

describe('CommunityGuidelinesCard', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders collapsed by default — heading visible, body hidden', () => {
    render(<CommunityGuidelinesCard />)
    expect(screen.getByText('Welcome to Prayer Wall')).toBeInTheDocument()
    expect(
      screen.queryByText(/place for prayer, honest conversation/i),
    ).not.toBeInTheDocument()
  })

  it('expands on header tap', async () => {
    const user = userEvent.setup()
    render(<CommunityGuidelinesCard />)
    await user.click(screen.getByRole('button', { name: /welcome to prayer wall/i }))
    expect(
      screen.getByText(/place for prayer, honest conversation/i),
    ).toBeInTheDocument()
  })

  it('dismiss button writes localStorage flag and hides card', async () => {
    const user = userEvent.setup()
    render(<CommunityGuidelinesCard />)
    await user.click(screen.getByRole('button', { name: /welcome to prayer wall/i }))
    await user.click(
      screen.getByRole('button', { name: /dismiss community guidelines card/i }),
    )
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true')
    expect(screen.queryByText('Welcome to Prayer Wall')).not.toBeInTheDocument()
  })

  it('renders null when already dismissed before mount', () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    const { container } = render(<CommunityGuidelinesCard />)
    expect(container).toBeEmptyDOMElement()
  })

  it('chevron rotates when expanded', async () => {
    const user = userEvent.setup()
    render(<CommunityGuidelinesCard />)
    const header = screen.getByRole('button', { name: /welcome to prayer wall/i })
    const chevron = header.querySelector('svg')
    expect(chevron?.getAttribute('class')).not.toMatch(/rotate-180/)
    await user.click(header)
    expect(chevron?.getAttribute('class')).toMatch(/rotate-180/)
  })
})
