import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { MonthlyShareButton } from '../MonthlyShareButton'

const mockShowToast = vi.fn()

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast, showCelebrationToast: vi.fn() }),
}))

describe('MonthlyShareButton', () => {
  it('renders share button', () => {
    render(<MonthlyShareButton />)
    expect(screen.getByText('Share Your Month')).toBeInTheDocument()
  })

  it('shows toast on click with exact spec message', async () => {
    const user = userEvent.setup()
    render(<MonthlyShareButton />)
    await user.click(screen.getByText('Share Your Month'))
    expect(mockShowToast).toHaveBeenCalledWith(
      'Sharing your report is coming soon.',
      'success',
    )
  })

  it('has correct aria-label', () => {
    render(<MonthlyShareButton />)
    expect(
      screen.getByLabelText('Share your monthly report'),
    ).toBeInTheDocument()
  })
})
