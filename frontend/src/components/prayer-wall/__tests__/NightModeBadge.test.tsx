import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/hooks/useNightMode', () => ({
  useNightMode: vi.fn(),
}))

vi.mock('@/hooks/useSettings', () => ({
  useSettings: vi.fn(),
}))

import { useNightMode } from '@/hooks/useNightMode'
import { useSettings } from '@/hooks/useSettings'
import { NightModeBadge } from '../NightModeBadge'
import type { NightModePreference } from '@/types/settings'

const updatePrayerWall = vi.fn()
const updateProfile = vi.fn()
const updateNotifications = vi.fn()
const updatePrivacy = vi.fn()
const unblockUser = vi.fn()

function setupSettings() {
  vi.mocked(useSettings).mockReturnValue({
    settings: {} as never,
    updateProfile,
    updateNotifications,
    updatePrivacy,
    unblockUser,
    updatePrayerWall,
  })
}

function setupNightMode(active: boolean, userPreference: NightModePreference) {
  vi.mocked(useNightMode).mockReturnValue({
    active,
    source: userPreference === 'auto' ? 'auto' : 'manual',
    userPreference,
  })
}

function renderBadge() {
  return render(
    <MemoryRouter>
      <NightModeBadge />
    </MemoryRouter>,
  )
}

describe('NightModeBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupSettings()
  })

  it('renders null when night mode inactive', () => {
    setupNightMode(false, 'auto')
    const { container } = renderBadge()
    expect(container).toBeEmptyDOMElement()
  })

  it('renders badge when active with Auto label visible at sm+', () => {
    setupNightMode(true, 'auto')
    renderBadge()
    expect(screen.getByText('Auto')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /night mode is auto/i }),
    ).toBeInTheDocument()
  })

  it('cycles Off → Auto on tap', async () => {
    const user = userEvent.setup()
    setupNightMode(true, 'off')
    renderBadge()
    await user.click(screen.getByRole('button', { name: /night mode is off/i }))
    expect(updatePrayerWall).toHaveBeenCalledWith({ nightMode: 'auto' })
  })

  it('cycles Auto → On on tap', async () => {
    const user = userEvent.setup()
    setupNightMode(true, 'auto')
    renderBadge()
    await user.click(screen.getByRole('button', { name: /night mode is auto/i }))
    expect(updatePrayerWall).toHaveBeenCalledWith({ nightMode: 'on' })
  })

  it('cycles On → Off on tap', async () => {
    const user = userEvent.setup()
    setupNightMode(true, 'on')
    renderBadge()
    await user.click(screen.getByRole('button', { name: /night mode is on/i }))
    expect(updatePrayerWall).toHaveBeenCalledWith({ nightMode: 'off' })
  })

  it('aria-label reflects current preference state', () => {
    setupNightMode(true, 'auto')
    renderBadge()
    expect(
      screen.getByRole('button', { name: /night mode is auto\. tap to change\./i }),
    ).toBeInTheDocument()
  })

  it('does not render "always on" text in any state', () => {
    setupNightMode(true, 'on')
    renderBadge()
    expect(screen.queryByText(/always/i)).not.toBeInTheDocument()
  })

  it('info icon opens a focus-trapped popover with focus moved inside', async () => {
    const user = userEvent.setup()
    setupNightMode(true, 'auto')
    renderBadge()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /what is night mode/i }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    // useFocusTrap moves focus into the dialog on open. The dialog contains
    // a single tabbable element (the "Change in Settings" link), so focus
    // should land there or on the dialog itself.
    const dialogFocusable = dialog.querySelector('a, button, [tabindex]')
    expect(dialog.contains(document.activeElement)).toBe(true)
    expect(dialogFocusable).not.toBeNull()
  })
})
