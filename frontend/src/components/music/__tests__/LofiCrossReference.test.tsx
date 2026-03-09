import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LofiCrossReference } from '../LofiCrossReference'

describe('LofiCrossReference', () => {
  it('renders callout text', () => {
    render(<LofiCrossReference onNavigate={vi.fn()} />)
    expect(screen.getByText('Want music with your mix?')).toBeInTheDocument()
    expect(screen.getByText('Try Christian Lofi')).toBeInTheDocument()
  })

  it('calls onNavigate on click', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<LofiCrossReference onNavigate={onNavigate} />)
    await user.click(screen.getByRole('button'))
    expect(onNavigate).toHaveBeenCalledOnce()
  })

  it('is a native button element', () => {
    render(<LofiCrossReference onNavigate={vi.fn()} />)
    const button = screen.getByRole('button')
    expect(button.tagName).toBe('BUTTON')
  })

  it('calls onNavigate on Enter key', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<LofiCrossReference onNavigate={onNavigate} />)
    screen.getByRole('button').focus()
    await user.keyboard('{Enter}')
    expect(onNavigate).toHaveBeenCalledOnce()
  })
})
