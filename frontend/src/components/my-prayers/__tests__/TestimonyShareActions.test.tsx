import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestimonyShareActions } from '../TestimonyShareActions'
import { ToastProvider } from '@/components/ui/Toast'

vi.mock('@/lib/testimony-card-canvas', () => ({
  generateTestimonyCardImage: vi.fn(() =>
    Promise.resolve(new Blob(['test'], { type: 'image/png' })),
  ),
}))

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  prayerTitle: 'Healing for Mom',
  scriptureText: 'The Lord has heard my cry for mercy.',
  scriptureReference: 'Psalm 6:9',
}

function renderWithProviders(props = {}) {
  return render(
    <ToastProvider>
      <TestimonyShareActions {...defaultProps} {...props} />
    </ToastProvider>,
  )
}

describe('TestimonyShareActions', () => {
  it('renders when open', () => {
    renderWithProviders()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    renderWithProviders({ isOpen: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows Download button', () => {
    renderWithProviders()
    expect(screen.getByText('Download')).toBeInTheDocument()
  })

  it('shows Share or Copy Image button', () => {
    renderWithProviders()
    // In jsdom, navigator.share is not available, so we get Copy Image
    const btn = screen.getByText('Copy Image')
    expect(btn).toBeInTheDocument()
  })

  it('close button calls onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderWithProviders({ onClose })
    await user.click(screen.getByLabelText('Close share panel'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders preview image element', async () => {
    renderWithProviders()
    // Wait for the preview to generate
    const img = await screen.findByAltText('Testimony card preview')
    expect(img).toBeInTheDocument()
  })

  it('has correct aria attributes', () => {
    renderWithProviders()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'Share your testimony')
  })
})
