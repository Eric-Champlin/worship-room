import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ConversionPrompt } from '../ConversionPrompt'

function renderPrompt(props: { onDismiss?: () => void; prefersReducedMotion?: boolean } = {}) {
  const onDismiss = props.onDismiss ?? vi.fn()
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ConversionPrompt
        onDismiss={onDismiss}
        prefersReducedMotion={props.prefersReducedMotion ?? false}
      />
    </MemoryRouter>,
  )
}

describe('ConversionPrompt', () => {
  it('renders heading "This is just the beginning."', () => {
    renderPrompt()
    expect(screen.getByText('This is just the beginning.')).toBeInTheDocument()
  })

  it('renders body copy about free account', () => {
    renderPrompt()
    expect(
      screen.getByText(/Create a free account to save your prayers/),
    ).toBeInTheDocument()
  })

  it('"Get Started — It\'s Free" links to /register', () => {
    renderPrompt()
    const link = screen.getByRole('link', { name: "Get Started — It's Free" })
    expect(link).toHaveAttribute('href', '/register')
  })

  it('"Keep exploring" calls onDismiss', () => {
    const onDismiss = vi.fn()
    renderPrompt({ onDismiss })
    fireEvent.click(screen.getByRole('button', { name: 'Keep exploring' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('uses frosted glass classes', () => {
    renderPrompt()
    const container = screen.getByText('This is just the beginning.').closest('div')
    expect(container?.className).toContain('bg-white/5')
    expect(container?.className).toContain('backdrop-blur-sm')
    expect(container?.className).toContain('border-white/10')
    expect(container?.className).toContain('rounded-2xl')
  })

  it('uses animate-fade-in when motion allowed', () => {
    renderPrompt({ prefersReducedMotion: false })
    const container = screen.getByText('This is just the beginning.').closest('div')
    expect(container?.className).toContain('animate-fade-in')
  })

  it('no animate-fade-in when prefersReducedMotion', () => {
    renderPrompt({ prefersReducedMotion: true })
    const container = screen.getByText('This is just the beginning.').closest('div')
    expect(container?.className).not.toContain('animate-fade-in')
  })

  it('CTA has 44px min touch target', () => {
    renderPrompt()
    const link = screen.getByRole('link', { name: "Get Started — It's Free" })
    expect(link.className).toContain('min-h-[44px]')
  })

  it('"Keep exploring" has 44px min touch target', () => {
    renderPrompt()
    const button = screen.getByRole('button', { name: 'Keep exploring' })
    expect(button.className).toContain('min-h-[44px]')
  })
})
