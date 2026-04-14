import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { FirstRunWelcome } from '../FirstRunWelcome'

function renderWelcome(onDismiss = vi.fn()) {
  return {
    onDismiss,
    ...render(
      <MemoryRouter>
        <FirstRunWelcome onDismiss={onDismiss} />
      </MemoryRouter>,
    ),
  }
}

describe('FirstRunWelcome', () => {
  it('renders heading "Welcome to Worship Room"', () => {
    renderWelcome()
    expect(screen.getByText('Welcome to Worship Room')).toBeInTheDocument()
  })

  it('renders description text', () => {
    renderWelcome()
    expect(
      screen.getByText(/A quiet place to read Scripture/),
    ).toBeInTheDocument()
  })

  it('renders 4 start-here options', () => {
    renderWelcome()
    expect(
      screen.getByRole('button', { name: /Read the Bible/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Try a daily devotional/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Take the starting quiz/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Browse reading plans/ }),
    ).toBeInTheDocument()
  })

  it('clicking start-here option calls onDismiss', async () => {
    const { onDismiss } = renderWelcome()
    await userEvent.click(
      screen.getByRole('button', { name: /Read the Bible/ }),
    )
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('clicking "Maybe later" calls onDismiss', async () => {
    const { onDismiss } = renderWelcome()
    await userEvent.click(
      screen.getByRole('button', { name: /Maybe later/ }),
    )
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('Escape key calls onDismiss', () => {
    const { onDismiss } = renderWelcome()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('has role="dialog" and aria-modal="true"', () => {
    renderWelcome()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('has aria-label', () => {
    renderWelcome()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-label', 'Welcome to Worship Room')
  })

  it('uses frosted glass classes', () => {
    renderWelcome()
    const dialog = screen.getByRole('dialog')
    const card = dialog.firstElementChild as HTMLElement
    expect(card.className).toContain('bg-white/[0.06]')
    expect(card.className).toContain('backdrop-blur-sm')
  })

  it('motion-safe animation class', () => {
    renderWelcome()
    const dialog = screen.getByRole('dialog')
    const card = dialog.firstElementChild as HTMLElement
    expect(card.className).toContain('motion-safe:animate-fade-in-up')
  })

  it('start-here cards have min-h-[44px]', () => {
    renderWelcome()
    const button = screen.getByRole('button', { name: /Read the Bible/ })
    expect(button.className).toContain('min-h-[44px]')
  })

  it('Maybe later has focus-visible ring', () => {
    renderWelcome()
    const button = screen.getByRole('button', { name: /Maybe later/ })
    expect(button.className).toContain('focus-visible:ring-2')
  })
})
