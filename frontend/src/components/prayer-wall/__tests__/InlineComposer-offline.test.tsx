import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InlineComposer } from '../InlineComposer'

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(),
}))

import { useOnlineStatus } from '@/hooks/useOnlineStatus'
const mockUseOnlineStatus = vi.mocked(useOnlineStatus)

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
}

describe('InlineComposer offline handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows offline message when offline', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: false })
    render(<InlineComposer {...defaultProps} />)
    expect(
      screen.getByText('Posting prayers requires an internet connection')
    ).toBeInTheDocument()
  })

  it('disables submit when offline', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: false })
    render(<InlineComposer {...defaultProps} />)
    const submitButton = screen.getByRole('button', { name: /submit prayer request/i })
    expect(submitButton).toBeDisabled()
  })

  it('allows typing when offline', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: false })
    render(<InlineComposer {...defaultProps} />)
    const textarea = screen.getByRole('textbox', { name: /prayer request/i })
    fireEvent.change(textarea, { target: { value: 'Test prayer' } })
    expect(textarea).toHaveValue('Test prayer')
  })
})
