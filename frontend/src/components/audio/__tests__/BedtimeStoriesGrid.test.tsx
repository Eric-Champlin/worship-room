import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BedtimeStoriesGrid } from '../BedtimeStoriesGrid'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isLoggedIn: false }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: vi.fn() }),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

describe('BedtimeStoriesGrid', () => {
  it('renders "Bedtime Stories" heading', () => {
    render(<BedtimeStoriesGrid onPlay={vi.fn()} />)

    expect(
      screen.getByRole('heading', { name: 'Bedtime Stories' }),
    ).toBeInTheDocument()
  })

  it('renders all 12 story cards', () => {
    render(<BedtimeStoriesGrid onPlay={vi.fn()} />)

    // Each story card has a "Story" badge text and an inner play button
    const storyBadges = screen.getAllByText('Story')
    expect(storyBadges).toHaveLength(12)
  })
})
