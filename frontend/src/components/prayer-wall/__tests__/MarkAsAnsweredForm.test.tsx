import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MarkAsAnsweredForm } from '../MarkAsAnsweredForm'

describe('MarkAsAnsweredForm', () => {
  it('renders "Mark as Answered" button initially', () => {
    render(<MarkAsAnsweredForm onConfirm={vi.fn()} />)
    expect(screen.getByText('Mark as Answered')).toBeInTheDocument()
  })

  it('expands form on button click', async () => {
    const user = userEvent.setup()
    render(<MarkAsAnsweredForm onConfirm={vi.fn()} />)
    await user.click(screen.getByText('Mark as Answered'))
    expect(screen.getByLabelText('Share how God answered this prayer')).toBeInTheDocument()
    expect(screen.getByText('Confirm')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('calls onConfirm with praise text on Confirm click', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<MarkAsAnsweredForm onConfirm={onConfirm} />)
    await user.click(screen.getByText('Mark as Answered'))
    await user.type(screen.getByLabelText('Share how God answered this prayer'), 'God is good!')
    await user.click(screen.getByText('Confirm'))
    expect(onConfirm).toHaveBeenCalledWith('God is good!')
  })

  it('collapses form on Cancel click', async () => {
    const user = userEvent.setup()
    render(<MarkAsAnsweredForm onConfirm={vi.fn()} />)
    await user.click(screen.getByText('Mark as Answered'))
    expect(screen.getByLabelText('Share how God answered this prayer')).toBeInTheDocument()
    await user.click(screen.getByText('Cancel'))
    expect(screen.queryByLabelText('Share how God answered this prayer')).not.toBeInTheDocument()
  })
})
