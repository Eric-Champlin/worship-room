import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CommentInput } from '../CommentInput'

function renderInput(overrides?: { onLoginClick?: () => void }) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CommentInput
        prayerId="prayer-1"
        onSubmit={vi.fn()}
        onLoginClick={overrides?.onLoginClick}
      />
    </MemoryRouter>,
  )
}

describe('CommentInput', () => {
  it('shows "Log in to comment" link when logged out (no onLoginClick)', () => {
    renderInput()
    const link = screen.getByText('Log in to comment')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/login')
  })

  it('shows "Log in to comment" button when logged out (with onLoginClick)', () => {
    const onLoginClick = vi.fn()
    renderInput({ onLoginClick })
    const btn = screen.getByText('Log in to comment')
    expect(btn).toBeInTheDocument()
    expect(btn.tagName).toBe('BUTTON')
  })

  it('does not show text input when logged out', () => {
    renderInput()
    expect(screen.queryByLabelText('Write a comment')).not.toBeInTheDocument()
  })
})
