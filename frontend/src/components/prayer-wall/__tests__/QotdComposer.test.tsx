import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QotdComposer } from '../QotdComposer'

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
}

function renderComposer(overrides: Partial<typeof defaultProps> = {}) {
  return render(<QotdComposer {...defaultProps} {...overrides} />)
}

describe('QotdComposer', () => {
  it('renders textarea with placeholder', () => {
    renderComposer()
    expect(screen.getByPlaceholderText('Share your thoughts...')).toBeInTheDocument()
  })

  it('submit button is disabled when empty', () => {
    renderComposer()
    expect(screen.getByRole('button', { name: 'Post Response' })).toBeDisabled()
  })

  it('submit calls onSubmit with trimmed content', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderComposer({ onSubmit })

    await user.type(screen.getByLabelText('Your response to the question of the day'), '  Hello world  ')
    await user.click(screen.getByRole('button', { name: 'Post Response' }))

    expect(onSubmit).toHaveBeenCalledWith('Hello world')
  })

  it('character count shows at 400+ chars', async () => {
    const user = userEvent.setup()
    renderComposer()

    const textarea = screen.getByLabelText('Your response to the question of the day')
    await user.type(textarea, 'a'.repeat(400))

    expect(screen.getByText('400/500')).toBeInTheDocument()
  })

  it('character count shows danger styling at 500 chars', async () => {
    const user = userEvent.setup()
    renderComposer()

    const textarea = screen.getByLabelText('Your response to the question of the day')
    await user.type(textarea, 'a'.repeat(500))

    const counter = screen.getByText('500/500')
    expect(counter).toHaveClass('text-danger')
  })

  it('crisis detection shows banner', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderComposer({ onSubmit })

    const textarea = screen.getByLabelText('Your response to the question of the day')
    await user.type(textarea, 'I want to kill myself')
    await user.click(screen.getByRole('button', { name: 'Post Response' }))

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/going through a difficult time/)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('no anonymous checkbox present', () => {
    renderComposer()
    expect(screen.queryByText(/anonymously/i)).not.toBeInTheDocument()
  })

  it('no category selector present', () => {
    renderComposer()
    expect(screen.queryByText('Category')).not.toBeInTheDocument()
  })

  it('cancel resets form and calls onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderComposer({ onClose })

    const textarea = screen.getByLabelText('Your response to the question of the day')
    await user.type(textarea, 'some text')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalled()
    expect(textarea).toHaveValue('')
  })

  it('hidden when isOpen is false', () => {
    renderComposer({ isOpen: false })
    const wrapper = screen.getByLabelText('Your response to the question of the day').closest('[aria-hidden]')
    expect(wrapper).toHaveAttribute('aria-hidden', 'true')
  })

  it('textarea has accessible label', () => {
    renderComposer()
    expect(screen.getByLabelText('Your response to the question of the day')).toBeInTheDocument()
  })
})
