import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnniversaryCard } from '../AnniversaryCard'

// ── Mocks ───────────────────────────────────────────────────────────
const mockPlaySoundEffect = vi.fn()

vi.mock('@/hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({ playSoundEffect: mockPlaySoundEffect }),
}))

// ── Test helpers ────────────────────────────────────────────────────
const DEFAULT_PROPS = {
  heading: 'One Week with Worship Room',
  closingMessage: 'Keep going — God is growing something beautiful in you.',
  stats: [
    { label: 'Prayers', value: '5' },
    { label: 'Journal entries', value: '3' },
  ],
  onDismiss: vi.fn(),
}

// ── Tests ───────────────────────────────────────────────────────────
describe('AnniversaryCard', () => {
  beforeEach(() => {
    mockPlaySoundEffect.mockClear()
    DEFAULT_PROPS.onDismiss.mockClear()
  })

  it('renders heading per milestone', () => {
    render(<AnniversaryCard {...DEFAULT_PROPS} />)
    expect(screen.getByText('One Week with Worship Room')).toBeInTheDocument()
  })

  it('renders closing message', () => {
    render(<AnniversaryCard {...DEFAULT_PROPS} heading="One Month with Worship Room" closingMessage="A month of showing up." />)
    expect(screen.getByText('A month of showing up.')).toBeInTheDocument()
  })

  it('renders only non-zero stats', () => {
    render(<AnniversaryCard {...DEFAULT_PROPS} />)
    expect(screen.getByText(/Prayers/)).toBeInTheDocument()
    expect(screen.getByText(/Journal entries/)).toBeInTheDocument()
    expect(screen.queryByText(/Meditations/)).not.toBeInTheDocument()
  })

  it('dismiss button calls onDismiss', async () => {
    const user = userEvent.setup()
    render(<AnniversaryCard {...DEFAULT_PROPS} />)
    await user.click(screen.getByText('Dismiss'))
    expect(DEFAULT_PROPS.onDismiss).toHaveBeenCalledTimes(1)
  })

  it('plays sparkle sound on render', () => {
    render(<AnniversaryCard {...DEFAULT_PROPS} />)
    expect(mockPlaySoundEffect).toHaveBeenCalledWith('sparkle')
  })

  it('has golden glow ring', () => {
    render(<AnniversaryCard {...DEFAULT_PROPS} />)
    const card = screen.getByTestId('anniversary-card').closest('section')
    expect(card?.className).toContain('ring-amber-500/10')
  })

  it('dismiss button meets 44px touch target', () => {
    render(<AnniversaryCard {...DEFAULT_PROPS} />)
    const btn = screen.getByText('Dismiss')
    expect(btn.className).toContain('min-h-[44px]')
    expect(btn.className).toContain('min-w-[44px]')
  })
})
