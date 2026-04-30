import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QotdComposer } from '../QotdComposer'

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSubmit: vi.fn().mockResolvedValue(true),
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
    const onSubmit = vi.fn().mockResolvedValue(true)
    renderComposer({ onSubmit })

    await user.type(screen.getByLabelText('Your response to the question of the day'), '  Hello world  ')
    await user.click(screen.getByRole('button', { name: 'Post Response' }))

    expect(onSubmit).toHaveBeenCalledWith('Hello world', expect.any(String))
  })

  it('character count shows at 400+ chars', async () => {
    const user = userEvent.setup()
    renderComposer()

    const textarea = screen.getByLabelText('Your response to the question of the day')
    await user.type(textarea, 'a'.repeat(400))

    expect(screen.getByText('400 / 500')).toBeInTheDocument()
  })

  it('character count shows danger styling at 500 chars', async () => {
    const user = userEvent.setup()
    renderComposer()

    const textarea = screen.getByLabelText('Your response to the question of the day')
    await user.type(textarea, 'a'.repeat(500))

    const counter = screen.getByText('500 / 500')
    expect(counter).toHaveClass('text-red-400')
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

describe('QotdComposer — accessibility', () => {
  it('textarea has aria-describedby linking to char count', () => {
    renderComposer()
    const textarea = screen.getByLabelText('Your response to the question of the day')
    expect(textarea).toHaveAttribute('aria-describedby', 'qotd-char-count')
  })

  it('CharacterCount renders when above threshold', async () => {
    const user = userEvent.setup()
    renderComposer()
    const textarea = screen.getByLabelText('Your response to the question of the day')
    await user.type(textarea, 'a'.repeat(400))
    expect(screen.getByText('400 / 500')).toBeInTheDocument()
  })

  it('textarea has aria-invalid when over limit', async () => {
    renderComposer()
    const textarea = screen.getByLabelText('Your response to the question of the day') as HTMLTextAreaElement
    // Use native setter to bypass maxLength
    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
      nativeInputValueSetter?.call(textarea, 'a'.repeat(501))
      textarea.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(textarea).toHaveAttribute('aria-invalid', 'true')
  })

  it('CharacterCount uses zone-based colors', async () => {
    const user = userEvent.setup()
    renderComposer()
    const textarea = screen.getByLabelText('Your response to the question of the day')
    // At 400 chars (default warningAt = 80% of 500 = 400), should use warning color
    await user.type(textarea, 'a'.repeat(400))
    // CharacterCount component defaults warningAt to 80% of max = 400
    // At exactly 400 chars, zone is warning → text-amber-400
    expect(screen.getByText('400 / 500')).toHaveClass('text-amber-400')
  })
})
