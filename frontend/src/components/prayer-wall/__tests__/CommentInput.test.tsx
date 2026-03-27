import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '../AuthModalProvider'
import { CommentInput } from '../CommentInput'

const mockAuth = {
  user: null as { name: string } | null,
  isAuthenticated: false,
  login: vi.fn(),
  logout: vi.fn(),
}
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}))

function renderInput(overrides?: { onLoginClick?: () => void }) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
      <AuthModalProvider>
      <CommentInput
        prayerId="prayer-1"
        onSubmit={vi.fn()}
        onLoginClick={overrides?.onLoginClick}
      />
      </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('CommentInput', () => {
  it('shows "Log in to comment" button when logged out (no onLoginClick)', () => {
    renderInput()
    const btn = screen.getByText('Log in to comment')
    expect(btn).toBeInTheDocument()
    expect(btn.tagName).toBe('BUTTON')
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
    expect(screen.queryByLabelText('Comment')).not.toBeInTheDocument()
  })
})

describe('CommentInput (authenticated)', () => {
  beforeEach(() => {
    mockAuth.isAuthenticated = true
    mockAuth.user = { name: 'Eric' }
  })

  afterEach(() => {
    mockAuth.isAuthenticated = false
    mockAuth.user = null
  })

  it('input has aria-label "Comment"', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ToastProvider>
          <AuthModalProvider>
            <CommentInput prayerId="prayer-1" onSubmit={vi.fn()} />
          </AuthModalProvider>
        </ToastProvider>
      </MemoryRouter>,
    )
    expect(screen.getByLabelText('Comment')).toBeInTheDocument()
  })

  it('char count visible at 300+ chars', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ToastProvider>
          <AuthModalProvider>
            <CommentInput prayerId="prayer-1" onSubmit={vi.fn()} />
          </AuthModalProvider>
        </ToastProvider>
      </MemoryRouter>,
    )
    const input = screen.getByLabelText('Comment')
    await user.type(input, 'a'.repeat(300))
    expect(screen.getByText('300 / 500')).toBeInTheDocument()
  })
})
