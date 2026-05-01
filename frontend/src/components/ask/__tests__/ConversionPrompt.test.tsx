import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { ConversionPrompt } from '../ConversionPrompt'

const { mockOpenAuthModal } = vi.hoisted(() => ({
  mockOpenAuthModal: vi.fn(),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', async () => {
  const actual = await vi.importActual<
    typeof import('@/components/prayer-wall/AuthModalProvider')
  >('@/components/prayer-wall/AuthModalProvider')
  return {
    ...actual,
    useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
  }
})

function renderPrompt(props: { onDismiss?: () => void } = {}) {
  const onDismiss = props.onDismiss ?? vi.fn()
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthModalProvider>
          <ConversionPrompt onDismiss={onDismiss} />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('ConversionPrompt', () => {
  beforeEach(() => {
    mockOpenAuthModal.mockClear()
  })

  it('renders heading "This is just the beginning."', () => {
    renderPrompt()
    expect(screen.getByText('This is just the beginning.')).toBeInTheDocument()
  })

  it('renders body copy "Create an account" (no "free account" wording)', () => {
    renderPrompt()
    expect(screen.getByText(/Create an account to save your prayers/)).toBeInTheDocument()
    expect(screen.queryByText(/Create a free account/)).not.toBeInTheDocument()
  })

  it('CTA button reads "Create Your Account" and opens auth modal in register mode', () => {
    renderPrompt()
    const button = screen.getByRole('button', { name: 'Create Your Account' })
    fireEvent.click(button)
    expect(mockOpenAuthModal).toHaveBeenCalledTimes(1)
    expect(mockOpenAuthModal).toHaveBeenCalledWith(undefined, 'register')
  })

  it('no "Get Started — It\'s Free" text and no <Link> to /register', () => {
    renderPrompt()
    expect(
      screen.queryByText(/Get Started — It's Free/),
    ).not.toBeInTheDocument()
    const links = screen.queryAllByRole('link')
    expect(links).toHaveLength(0)
  })

  it('"Keep exploring" calls onDismiss', () => {
    const onDismiss = vi.fn()
    renderPrompt({ onDismiss })
    fireEvent.click(screen.getByRole('button', { name: 'Keep exploring' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('uses FrostedCard wrapper (bg-white/[0.07], backdrop-blur-sm, border-white/[0.12], rounded-3xl)', () => {
    renderPrompt()
    const card = screen
      .getByText('This is just the beginning.')
      .closest('.rounded-3xl') as HTMLElement | null
    expect(card).toBeInTheDocument()
    expect(card?.className).toContain('bg-white/[0.07]')
    expect(card?.className).toContain('backdrop-blur-sm')
    expect(card?.className).toContain('border-white/[0.12]')
  })

  it('wrapper uses motion-safe:animate-fade-in', () => {
    renderPrompt()
    const wrapper = screen
      .getByText('This is just the beginning.')
      .closest('.motion-safe\\:animate-fade-in')
    expect(wrapper).toBeInTheDocument()
  })

  it('CTA has animate-shine + white-pill classes', () => {
    renderPrompt()
    const button = screen.getByRole('button', { name: 'Create Your Account' })
    expect(button.className).toContain('animate-shine')
    expect(button.className).toContain('bg-white')
    expect(button.className).toContain('text-primary')
    expect(button.className).toContain('rounded-full')
  })

  it('CTA has 44px min touch target', () => {
    renderPrompt()
    const button = screen.getByRole('button', { name: 'Create Your Account' })
    expect(button.className).toContain('min-h-[44px]')
  })

  it('"Keep exploring" dismiss link uses WCAG-fixed text-white/70 hover:text-white with underline', () => {
    renderPrompt()
    const button = screen.getByRole('button', { name: 'Keep exploring' })
    expect(button.className).toContain('text-white/70')
    expect(button.className).toContain('hover:text-white')
    expect(button.className).toContain('underline')
    expect(button.className).not.toContain('text-primary-lt')
  })

  it('"Keep exploring" has 44px min touch target', () => {
    renderPrompt()
    const button = screen.getByRole('button', { name: 'Keep exploring' })
    expect(button.className).toContain('min-h-[44px]')
  })
})
