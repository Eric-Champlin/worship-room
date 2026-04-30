import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock auth + auth modal + toast BEFORE importing ReportDialog.
const mockIsAuthenticated = { value: true }
const mockOpenAuthModal = vi.fn()
const mockShowToast = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated.value,
    user: mockIsAuthenticated.value ? { id: 'u-1', name: 'Test' } : null,
  }),
}))

vi.mock('../AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast, showCelebrationToast: vi.fn() }),
}))

import { ApiError } from '@/types/auth'
import { ReportDialog } from '../ReportDialog'

describe('ReportDialog', () => {
  beforeEach(() => {
    mockIsAuthenticated.value = true
    mockOpenAuthModal.mockClear()
    mockShowToast.mockClear()
  })

  it('renders Report button', () => {
    render(<ReportDialog prayerId="prayer-1" />)
    expect(screen.getByText('Report')).toBeInTheDocument()
  })

  it('opens dialog with reason picker on click when authenticated', async () => {
    const user = userEvent.setup()
    render(<ReportDialog prayerId="prayer-1" />)
    await user.click(screen.getByText('Report'))
    expect(screen.getByText('Report Prayer Request')).toBeInTheDocument()
    expect(screen.getByLabelText('Report reason')).toBeInTheDocument()
    expect(screen.getByText('Submit Report')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('opens AuthModal when anonymous, dialog does NOT open', async () => {
    mockIsAuthenticated.value = false
    const user = userEvent.setup()
    render(<ReportDialog prayerId="prayer-1" />)
    await user.click(screen.getByText('Report'))
    expect(mockOpenAuthModal).toHaveBeenCalled()
    expect(screen.queryByText('Report Prayer Request')).not.toBeInTheDocument()
  })

  it('reason picker renders 6 options', async () => {
    const user = userEvent.setup()
    render(<ReportDialog prayerId="prayer-1" />)
    await user.click(screen.getByText('Report'))
    expect(screen.getByLabelText('Spam')).toBeInTheDocument()
    expect(screen.getByLabelText('Harassment')).toBeInTheDocument()
    expect(screen.getByLabelText('Hate speech')).toBeInTheDocument()
    expect(screen.getByLabelText('Self-harm')).toBeInTheDocument()
    expect(screen.getByLabelText('Inappropriate content')).toBeInTheDocument()
    expect(screen.getByLabelText('Other')).toBeInTheDocument()
  })

  it('default selected reason is "Other"', async () => {
    const user = userEvent.setup()
    render(<ReportDialog prayerId="prayer-1" />)
    await user.click(screen.getByText('Report'))
    expect(screen.getByLabelText('Other')).toBeChecked()
    expect(screen.getByLabelText('Spam')).not.toBeChecked()
  })

  it('selecting a reason updates state', async () => {
    const user = userEvent.setup()
    render(<ReportDialog prayerId="prayer-1" />)
    await user.click(screen.getByText('Report'))
    await user.click(screen.getByLabelText('Spam'))
    expect(screen.getByLabelText('Spam')).toBeChecked()
    expect(screen.getByLabelText('Other')).not.toBeChecked()
  })

  it('calls onReport with reason + details on submit', async () => {
    const user = userEvent.setup()
    const onReport = vi.fn().mockResolvedValue(undefined)
    render(<ReportDialog prayerId="prayer-1" onReport={onReport} />)
    await user.click(screen.getByText('Report'))
    await user.click(screen.getByLabelText('Spam'))
    await user.type(screen.getByLabelText('Report reason'), 'looks like spam')
    await user.click(screen.getByText('Submit Report'))
    expect(onReport).toHaveBeenCalledWith('prayer-1', 'spam', 'looks like spam')
  })

  it('passes undefined details when textarea empty', async () => {
    const user = userEvent.setup()
    const onReport = vi.fn().mockResolvedValue(undefined)
    render(<ReportDialog prayerId="prayer-1" onReport={onReport} />)
    await user.click(screen.getByText('Report'))
    await user.click(screen.getByText('Submit Report'))
    expect(onReport).toHaveBeenCalledWith('prayer-1', 'other', undefined)
  })

  it('shows success message after successful submission', async () => {
    const user = userEvent.setup()
    const onReport = vi.fn().mockResolvedValue(undefined)
    render(<ReportDialog prayerId="prayer-1" onReport={onReport} />)
    await user.click(screen.getByText('Report'))
    await user.click(screen.getByText('Submit Report'))
    await waitFor(() => {
      expect(
        screen.getByText('Report submitted. Thank you for keeping this safe.'),
      ).toBeInTheDocument()
    })
  })

  it('shows toast on 404 ApiError', async () => {
    const user = userEvent.setup()
    const onReport = vi.fn().mockRejectedValue(
      new ApiError('NOT_FOUND', 404, 'no longer available', 'r-1'),
    )
    render(<ReportDialog prayerId="prayer-1" onReport={onReport} />)
    await user.click(screen.getByText('Report'))
    await user.click(screen.getByText('Submit Report'))
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'This content is no longer available.',
        'error',
      )
    })
  })

  it('shows toast with backend message on 429 ApiError', async () => {
    const user = userEvent.setup()
    const backendMessage =
      "You're submitting reports quickly — please wait about 1 hour before trying again."
    const onReport = vi.fn().mockRejectedValue(
      new ApiError('RATE_LIMITED', 429, backendMessage, 'r-1'),
    )
    render(<ReportDialog prayerId="prayer-1" onReport={onReport} />)
    await user.click(screen.getByText('Report'))
    await user.click(screen.getByText('Submit Report'))
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(backendMessage, 'error')
    })
  })

  it('shows toast on 400 SELF_REPORT', async () => {
    const user = userEvent.setup()
    const onReport = vi.fn().mockRejectedValue(
      new ApiError('SELF_REPORT', 400, 'self report', 'r-1'),
    )
    render(<ReportDialog prayerId="prayer-1" onReport={onReport} />)
    await user.click(screen.getByText('Report'))
    await user.click(screen.getByText('Submit Report'))
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        "You can't report your own posts.",
        'error',
      )
    })
  })

  it('does NOT show toast on 401 ApiError (handled globally)', async () => {
    const user = userEvent.setup()
    const onReport = vi.fn().mockRejectedValue(
      new ApiError('UNAUTHORIZED', 401, 'unauthorized', 'r-1'),
    )
    render(<ReportDialog prayerId="prayer-1" onReport={onReport} />)
    await user.click(screen.getByText('Report'))
    await user.click(screen.getByText('Submit Report'))
    // Wait for the rejected promise's catch handler to settle. The handler
    // is synchronous after the await, so flushing microtasks is enough —
    // a wall-clock setTimeout would be flaky on slow CI.
    await waitFor(() => expect(onReport).toHaveBeenCalled())
    await Promise.resolve()
    await Promise.resolve()
    expect(mockShowToast).not.toHaveBeenCalled()
  })

  it('shows generic toast on non-ApiError', async () => {
    const user = userEvent.setup()
    const onReport = vi.fn().mockRejectedValue(new Error('network down'))
    render(<ReportDialog prayerId="prayer-1" onReport={onReport} />)
    await user.click(screen.getByText('Report'))
    await user.click(screen.getByText('Submit Report'))
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Something went wrong. Try again in a moment.',
        'error',
      )
    })
  })

  it('textarea has maxLength 500', async () => {
    const user = userEvent.setup()
    render(<ReportDialog prayerId="prayer-1" />)
    await user.click(screen.getByText('Report'))
    expect(screen.getByLabelText('Report reason')).toHaveAttribute('maxLength', '500')
  })

  it('character count renders when typing 300+ chars', async () => {
    const user = userEvent.setup()
    render(<ReportDialog prayerId="prayer-1" />)
    await user.click(screen.getByText('Report'))
    await user.type(screen.getByLabelText('Report reason'), 'a'.repeat(300))
    expect(screen.getByText('300 / 500')).toBeInTheDocument()
  })

  it('textarea has aria-describedby', async () => {
    const user = userEvent.setup()
    render(<ReportDialog prayerId="prayer-1" />)
    await user.click(screen.getByText('Report'))
    expect(screen.getByLabelText('Report reason')).toHaveAttribute(
      'aria-describedby',
      'report-char-count',
    )
  })
})
