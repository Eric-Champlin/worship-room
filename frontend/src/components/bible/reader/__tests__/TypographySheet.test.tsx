import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TypographySheet } from '../TypographySheet'
import type { ReaderSettings } from '@/hooks/useReaderSettings'

const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'midnight',
  typeSize: 'm',
  lineHeight: 'normal',
  fontFamily: 'serif',
}

function renderSheet(overrides?: Partial<Parameters<typeof TypographySheet>[0]>) {
  const onClose = overrides?.onClose ?? vi.fn()
  const onUpdate = overrides?.onUpdate ?? vi.fn()
  const onReset = overrides?.onReset ?? vi.fn()

  return {
    onClose,
    onUpdate,
    onReset,
    ...render(
      <TypographySheet
        isOpen={overrides?.isOpen ?? true}
        onClose={onClose}
        settings={overrides?.settings ?? DEFAULT_SETTINGS}
        onUpdate={onUpdate}
        onReset={onReset}
      />,
    ),
  }
}

describe('TypographySheet', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <TypographySheet
        isOpen={false}
        onClose={vi.fn()}
        settings={DEFAULT_SETTINGS}
        onUpdate={vi.fn()}
        onReset={vi.fn()}
      />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders dialog when open', () => {
    renderSheet()
    expect(screen.getByRole('dialog', { name: 'Typography settings' })).toBeTruthy()
  })

  it('closes on X button click', async () => {
    const user = userEvent.setup()
    const { onClose } = renderSheet()

    await user.click(screen.getByLabelText('Close typography settings'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('theme cards update setting on click', async () => {
    const user = userEvent.setup()
    const { onUpdate } = renderSheet()

    await user.click(screen.getByLabelText('Parchment theme'))
    expect(onUpdate).toHaveBeenCalledWith('theme', 'parchment')
  })

  it('reset to defaults calls onReset', async () => {
    const user = userEvent.setup()
    const { onReset } = renderSheet()

    await user.click(screen.getByText('Reset to defaults'))
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('active theme card has aria-pressed true', () => {
    renderSheet({ settings: { ...DEFAULT_SETTINGS, theme: 'sepia' } })

    expect(screen.getByLabelText('Sepia theme').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByLabelText('Midnight theme').getAttribute('aria-pressed')).toBe('false')
  })
})
