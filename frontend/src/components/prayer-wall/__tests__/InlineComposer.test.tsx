import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InlineComposer } from '../InlineComposer'

function renderComposer(overrides?: { isOpen?: boolean; onClose?: () => void; onSubmit?: (content: string, isAnonymous: boolean) => void }) {
  return render(
    <InlineComposer
      isOpen={overrides?.isOpen ?? true}
      onClose={overrides?.onClose ?? vi.fn()}
      onSubmit={overrides?.onSubmit ?? vi.fn()}
    />,
  )
}

describe('InlineComposer', () => {
  it('renders textarea and submit button when open', () => {
    renderComposer()
    expect(screen.getByLabelText('Prayer request')).toBeInTheDocument()
    expect(screen.getByText('Submit Prayer Request')).toBeInTheDocument()
  })

  it('submit button disabled when textarea is empty', () => {
    renderComposer()
    const submitBtn = screen.getByText('Submit Prayer Request')
    expect(submitBtn).toBeDisabled()
  })

  it('submit button enabled when textarea has content', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.type(screen.getByLabelText('Prayer request'), 'Please pray for me')
    const submitBtn = screen.getByText('Submit Prayer Request')
    expect(submitBtn).not.toBeDisabled()
  })

  it('character counter appears at 500+ characters', async () => {
    const user = userEvent.setup()
    renderComposer()
    const longText = 'a'.repeat(510)
    await user.type(screen.getByLabelText('Prayer request'), longText)
    expect(screen.getByText('510/1,000')).toBeInTheDocument()
  })

  it('cancel button calls onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderComposer({ onClose })
    await user.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('submit calls onSubmit with content and anonymous flag', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderComposer({ onSubmit })
    await user.type(screen.getByLabelText('Prayer request'), 'My prayer')
    await user.click(screen.getByText('Submit Prayer Request'))
    expect(onSubmit).toHaveBeenCalledWith('My prayer', false)
  })

  it('submit with anonymous checked', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderComposer({ onSubmit })
    await user.type(screen.getByLabelText('Prayer request'), 'My prayer')
    await user.click(screen.getByLabelText('Post anonymously'))
    await user.click(screen.getByText('Submit Prayer Request'))
    expect(onSubmit).toHaveBeenCalledWith('My prayer', true)
  })
})
