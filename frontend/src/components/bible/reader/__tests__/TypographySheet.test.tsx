import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TypographySheet } from '../TypographySheet'
import type { ReaderSettings } from '@/hooks/useReaderSettings'
import type { FocusModeSettings } from '@/hooks/useFocusMode'

const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'midnight',
  typeSize: 'm',
  lineHeight: 'normal',
  fontFamily: 'serif',
  ambientAudioVisible: true,
  ambientAudioAutoStart: false,
  ambientAudioAutoStartSound: null,
  ambientAudioVolume: 35,
}

const DEFAULT_FOCUS_SETTINGS: FocusModeSettings = {
  enabled: true,
  delay: 6000,
  dimOrbs: true,
}

function renderSheet(overrides?: Partial<Parameters<typeof TypographySheet>[0]>) {
  const onClose = overrides?.onClose ?? vi.fn()
  const onUpdate = overrides?.onUpdate ?? vi.fn()
  const onReset = overrides?.onReset ?? vi.fn()
  const onFocusSettingUpdate = overrides?.onFocusSettingUpdate ?? vi.fn()

  return {
    onClose,
    onUpdate,
    onReset,
    onFocusSettingUpdate,
    ...render(
      <TypographySheet
        isOpen={overrides?.isOpen ?? true}
        onClose={onClose}
        settings={overrides?.settings ?? DEFAULT_SETTINGS}
        onUpdate={onUpdate}
        onReset={onReset}
        focusSettings={overrides?.focusSettings ?? DEFAULT_FOCUS_SETTINGS}
        onFocusSettingUpdate={onFocusSettingUpdate}
      />,
    ),
  }
}

describe('TypographySheet', () => {
  it('renders nothing when closed', () => {
    const { container } = renderSheet({ isOpen: false })
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

  // --- Focus Mode Section ---

  it('renders Focus mode section when sheet is open', () => {
    renderSheet()

    expect(screen.getByText('Focus mode')).toBeTruthy()
  })

  it('enabled toggle calls onFocusSettingUpdate', async () => {
    const user = userEvent.setup()
    const { onFocusSettingUpdate } = renderSheet({
      focusSettings: { enabled: true, delay: 6000, dimOrbs: true },
    })

    await user.click(screen.getByLabelText('Focus mode enabled'))
    expect(onFocusSettingUpdate).toHaveBeenCalledWith('enabled', false)
  })

  it('timing buttons hidden when focus disabled', () => {
    renderSheet({
      focusSettings: { enabled: false, delay: 6000, dimOrbs: true },
    })

    expect(screen.queryByText('3s')).toBeNull()
    expect(screen.queryByText('6s')).toBeNull()
    expect(screen.queryByText('12s')).toBeNull()
  })

  it('timing buttons visible when focus enabled', () => {
    renderSheet({
      focusSettings: { enabled: true, delay: 6000, dimOrbs: true },
    })

    expect(screen.getByText('3s')).toBeTruthy()
    expect(screen.getByText('6s')).toBeTruthy()
    expect(screen.getByText('12s')).toBeTruthy()
  })

  it('timing button calls onFocusSettingUpdate with delay', async () => {
    const user = userEvent.setup()
    const { onFocusSettingUpdate } = renderSheet({
      focusSettings: { enabled: true, delay: 6000, dimOrbs: true },
    })

    await user.click(screen.getByText('3s'))
    expect(onFocusSettingUpdate).toHaveBeenCalledWith('delay', 3000)
  })

  it('dim orbs toggle hidden when focus disabled', () => {
    renderSheet({
      focusSettings: { enabled: false, delay: 6000, dimOrbs: true },
    })

    expect(screen.queryByLabelText('Dim orbs in focus mode')).toBeNull()
  })

  it('caption text is correct', () => {
    renderSheet()

    expect(
      screen.getByText(
        "The chrome fades when you're still. Move or tap to bring it back.",
      ),
    ).toBeTruthy()
  })

  it('ToggleSwitch has role=switch and aria-checked', () => {
    renderSheet({
      focusSettings: { enabled: true, delay: 6000, dimOrbs: true },
    })

    const toggle = screen.getByLabelText('Focus mode enabled')
    expect(toggle.getAttribute('role')).toBe('switch')
    expect(toggle.getAttribute('aria-checked')).toBe('true')
  })

  // --- Background sound section (BB-20) ---

  it('renders "Background sound" section heading', () => {
    renderSheet()
    expect(screen.getByText('Background sound')).toBeInTheDocument()
  })

  it('"Show audio control" toggle reflects setting', () => {
    renderSheet({ settings: { ...DEFAULT_SETTINGS, ambientAudioVisible: true } })
    const toggle = screen.getByLabelText('Show audio control in reader')
    expect(toggle.getAttribute('aria-checked')).toBe('true')
  })

  it('toggling "Show audio control" calls onUpdate', async () => {
    const user = userEvent.setup()
    const { onUpdate } = renderSheet()
    await user.click(screen.getByLabelText('Show audio control in reader'))
    expect(onUpdate).toHaveBeenCalledWith('ambientAudioVisible', false)
  })

  it('"Auto-start" toggle disabled when visibility off', () => {
    renderSheet({ settings: { ...DEFAULT_SETTINGS, ambientAudioVisible: false } })
    const container = screen.getByLabelText('Auto-start sound when opening a chapter').closest('div')
    expect(container?.className).toContain('pointer-events-none')
    expect(container?.className).toContain('opacity-40')
  })

  it('"Auto-start" toggle enabled when visibility on', () => {
    renderSheet({ settings: { ...DEFAULT_SETTINGS, ambientAudioVisible: true } })
    const container = screen.getByLabelText('Auto-start sound when opening a chapter').closest('div')
    expect(container?.className).not.toContain('pointer-events-none')
  })

  it('sound picker visible only when auto-start on', () => {
    renderSheet({ settings: { ...DEFAULT_SETTINGS, ambientAudioAutoStart: false } })
    expect(screen.queryByText('Last played sound')).not.toBeInTheDocument()

    renderSheet({ settings: { ...DEFAULT_SETTINGS, ambientAudioAutoStart: true } })
    expect(screen.getByText('Last played sound')).toBeInTheDocument()
  })

  it('sound picker shows "Last played" + 4 curated sounds', () => {
    renderSheet({ settings: { ...DEFAULT_SETTINGS, ambientAudioAutoStart: true } })
    expect(screen.getByText('Last played sound')).toBeInTheDocument()
    expect(screen.getByText('Gentle Rain')).toBeInTheDocument()
    expect(screen.getByText('Ocean Waves')).toBeInTheDocument()
    expect(screen.getByText('Fireplace')).toBeInTheDocument()
    expect(screen.getByText('Soft Piano')).toBeInTheDocument()
  })

  it('selecting a sound calls onUpdate', async () => {
    const user = userEvent.setup()
    const { onUpdate } = renderSheet({
      settings: { ...DEFAULT_SETTINGS, ambientAudioAutoStart: true },
    })
    await user.click(screen.getByText('Ocean Waves'))
    expect(onUpdate).toHaveBeenCalledWith('ambientAudioAutoStartSound', 'ocean-waves')
  })

  it('"Last played" option selected when value is null', () => {
    renderSheet({
      settings: { ...DEFAULT_SETTINGS, ambientAudioAutoStart: true, ambientAudioAutoStartSound: null },
    })
    const btn = screen.getByText('Last played sound')
    expect(btn.className).toContain('bg-primary')
  })
})
