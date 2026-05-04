import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { EveningReflectionBanner } from '../EveningReflectionBanner'

function renderBanner(overrides: Partial<Parameters<typeof EveningReflectionBanner>[0]> = {}) {
  const defaultProps = {
    onReflectNow: vi.fn(),
    onDismiss: vi.fn(),
    ...overrides,
  }
  return { ...render(<EveningReflectionBanner {...defaultProps} />), ...defaultProps }
}

describe('EveningReflectionBanner', () => {
  it('renders heading and subheading', () => {
    renderBanner()
    expect(screen.getByText('Evening Reflection')).toBeInTheDocument()
    expect(screen.getByText('Take a moment to close your day with God.')).toBeInTheDocument()
  })

  it('renders Reflect Now button', () => {
    renderBanner()
    expect(screen.getByRole('button', { name: 'Reflect Now' })).toBeInTheDocument()
  })

  it('renders Not tonight button', () => {
    renderBanner()
    expect(screen.getByRole('button', { name: 'Not tonight' })).toBeInTheDocument()
  })

  it('calls onReflectNow when Reflect Now is clicked', async () => {
    const user = userEvent.setup()
    const { onReflectNow } = renderBanner()
    await user.click(screen.getByRole('button', { name: 'Reflect Now' }))
    expect(onReflectNow).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when Not tonight is clicked', async () => {
    const user = userEvent.setup()
    const { onDismiss } = renderBanner()
    await user.click(screen.getByRole('button', { name: 'Not tonight' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('has Moon icon (aria-hidden)', () => {
    const { container } = renderBanner()
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('buttons have visible focus rings', () => {
    renderBanner()
    const reflectBtn = screen.getByRole('button', { name: 'Reflect Now' })
    // Migrated to <Button variant="subtle"> — uses focus-visible:ring-2 (keyboard-only focus)
    expect(reflectBtn.className).toContain('focus-visible:ring-2')

    const dismissBtn = screen.getByRole('button', { name: 'Not tonight' })
    expect(dismissBtn.className).toContain('focus:ring-2')
  })

  it('Reflect Now uses Button subtle variant', () => {
    renderBanner()
    const reflectBtn = screen.getByRole('button', { name: 'Reflect Now' })
    expect(reflectBtn.className).toContain('bg-white/[0.07]')
    expect(reflectBtn.className).toContain('border-white/[0.12]')
    expect(reflectBtn.className).toContain('rounded-full')
  })

  it('Not tonight button has min touch target (44px)', () => {
    renderBanner()
    const dismissBtn = screen.getByRole('button', { name: 'Not tonight' })
    expect(dismissBtn.className).toContain('min-h-[44px]')
  })
})
