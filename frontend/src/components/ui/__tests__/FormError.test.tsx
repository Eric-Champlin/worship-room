import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { FormError } from '../FormError'

describe('FormError', () => {
  it('defaults to error severity with assertive alert semantics', () => {
    render(<FormError>We couldn&apos;t save that. Try again.</FormError>)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('aria-live', 'assertive')
    expect(alert).toHaveTextContent("We couldn't save that. Try again.")
  })

  it('renders warning severity with a polite alert', () => {
    render(<FormError severity="warning">Heads up.</FormError>)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('aria-live', 'polite')
  })

  it('renders info severity with a polite status region', () => {
    render(<FormError severity="info">Heads up.</FormError>)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders the children as the message', () => {
    render(
      <FormError>
        <strong>Error:</strong> couldn&apos;t reach the server.
      </FormError>,
    )
    expect(screen.getByText(/couldn.t reach the server/)).toBeInTheDocument()
  })

  it('does not render a dismiss button when onDismiss is omitted', () => {
    render(<FormError>Message.</FormError>)
    expect(screen.queryByRole('button', { name: 'Dismiss message' })).not.toBeInTheDocument()
  })

  it('renders a dismiss button when onDismiss is provided', () => {
    render(<FormError onDismiss={() => {}}>Message.</FormError>)
    expect(screen.getByRole('button', { name: 'Dismiss message' })).toBeInTheDocument()
  })

  it('invokes onDismiss when the dismiss button is clicked', () => {
    const onDismiss = vi.fn()
    render(<FormError onDismiss={onDismiss}>Message.</FormError>)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss message' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('invokes onDismiss via keyboard (Enter)', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<FormError onDismiss={onDismiss}>Message.</FormError>)
    const btn = screen.getByRole('button', { name: 'Dismiss message' })
    btn.focus()
    await user.keyboard('{Enter}')
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('dismiss button meets the 44x44 touch-target size', () => {
    render(<FormError onDismiss={() => {}}>Message.</FormError>)
    const btn = screen.getByRole('button', { name: 'Dismiss message' })
    expect(btn.className).toContain('min-h-[44px]')
    expect(btn.className).toContain('min-w-[44px]')
  })

  it('uses muted tonal colors instead of emergency-red for the error severity', () => {
    render(<FormError>Message.</FormError>)
    const alert = screen.getByRole('alert')
    // muted red-brown, not pure bg-red-500 / bg-red-600
    expect(alert.className).toContain('bg-red-950/30')
    expect(alert.className).toContain('text-red-100')
    expect(alert.className).not.toMatch(/\bbg-red-500\b/)
    expect(alert.className).not.toMatch(/\bbg-red-600\b/)
  })

  it('renders the severity icon with aria-hidden', () => {
    const { container } = render(<FormError>Message.</FormError>)
    const icon = container.querySelector('svg[aria-hidden="true"]')
    expect(icon).toBeInTheDocument()
  })

  it('merges className onto the wrapper', () => {
    render(<FormError className="custom-class">Message.</FormError>)
    expect(screen.getByRole('alert').className).toContain('custom-class')
  })
})
