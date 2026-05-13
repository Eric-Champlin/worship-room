import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { NightWatchChip } from '../NightWatchChip'

function renderChip(source: 'auto' | 'manual' = 'auto') {
  return render(
    <MemoryRouter>
      <NightWatchChip source={source} />
    </MemoryRouter>,
  )
}

describe('NightWatchChip', () => {
  it('renders Moon icon + "Night Mode" text', () => {
    renderChip('auto')
    expect(screen.getByText('Night Mode')).toBeInTheDocument()
  })

  it('does NOT render "(always on)" subtitle when source="auto"', () => {
    renderChip('auto')
    expect(screen.queryByText('(always on)')).not.toBeInTheDocument()
  })

  it('renders "(always on)" subtitle when source="manual"', () => {
    renderChip('manual')
    expect(screen.getByText('(always on)')).toBeInTheDocument()
  })

  it('aria-label is "Night Mode active" for source="auto"', () => {
    renderChip('auto')
    expect(
      screen.getByRole('button', { name: 'Night Mode active' }),
    ).toBeInTheDocument()
  })

  it('aria-label is "Night Mode active (always on)" for source="manual"', () => {
    renderChip('manual')
    expect(
      screen.getByRole('button', { name: 'Night Mode active (always on)' }),
    ).toBeInTheDocument()
  })

  it('opens popover on click', async () => {
    const user = userEvent.setup()
    renderChip('auto')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Night Mode active' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('popover has role="dialog" + aria-modal="true"', async () => {
    const user = userEvent.setup()
    renderChip('auto')
    await user.click(screen.getByRole('button', { name: 'Night Mode active' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('keyboard: Enter opens popover when chip is focused', async () => {
    const user = userEvent.setup()
    renderChip('auto')
    const chip = screen.getByRole('button', { name: 'Night Mode active' })
    chip.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('keyboard: Esc closes popover and restores focus to chip (W26)', async () => {
    const user = userEvent.setup()
    renderChip('auto')
    const chip = screen.getByRole('button', { name: 'Night Mode active' })
    await user.click(chip)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(chip)
  })

  it('popover Link targets /settings?tab=privacy#night-mode', async () => {
    const user = userEvent.setup()
    renderChip('auto')
    await user.click(screen.getByRole('button', { name: 'Night Mode active' }))
    const link = screen.getByRole('link', { name: /change in settings/i })
    expect(link).toHaveAttribute('href', '/settings?tab=privacy#night-mode')
  })

  it('chip meets 44px minimum tap target (W21)', () => {
    renderChip('auto')
    const chip = screen.getByRole('button', { name: 'Night Mode active' })
    expect(chip).toHaveClass('min-h-[44px]')
    expect(chip).toHaveClass('min-w-[44px]')
  })

  it('breathing-glow uses motion-safe modifier so reduced-motion disables it', () => {
    const { container } = renderChip('auto')
    const moonIcon = container.querySelector('svg')
    expect(moonIcon).not.toBeNull()
    expect(moonIcon!.getAttribute('class')).toContain(
      'motion-safe:animate-night-pulse',
    )
  })
})
