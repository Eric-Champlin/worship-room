import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CustomizePanel } from '../CustomizePanel'
import { WIDGET_DEFINITIONS, type WidgetId } from '@/constants/dashboard/widget-order'

beforeEach(() => {
  localStorage.clear()
})

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  orderedWidgets: WIDGET_DEFINITIONS.map((w) => w.id) as WidgetId[],
  hiddenWidgets: [] as WidgetId[],
  onUpdateOrder: vi.fn(),
  onToggleVisibility: vi.fn(),
  onResetToDefault: vi.fn(),
}

function renderPanel(overrides: Partial<typeof defaultProps> = {}) {
  return render(<CustomizePanel {...defaultProps} {...overrides} />)
}

describe('CustomizePanel', () => {
  it('renders panel with role="dialog" and aria-modal', () => {
    renderPanel()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'Customize Dashboard')
  })

  it('shows all 15 widgets with names', () => {
    renderPanel()
    for (const def of WIDGET_DEFINITIONS) {
      expect(screen.getByText(def.label)).toBeInTheDocument()
    }
  })

  it('toggling a widget off calls onToggleVisibility', () => {
    const onToggle = vi.fn()
    renderPanel({ onToggleVisibility: onToggle })
    // Find the toggle for "Verse of the Day" and click it
    const toggles = screen.getAllByRole('switch')
    // All should be checked initially
    expect(toggles[0]).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(toggles[0])
    expect(onToggle).toHaveBeenCalled()
  })

  it('toggling a hidden widget back on calls onToggleVisibility with true', () => {
    const onToggle = vi.fn()
    renderPanel({
      onToggleVisibility: onToggle,
      hiddenWidgets: ['votd'] as WidgetId[],
    })
    // Find the votd toggle by aria-label
    const votdToggle = screen.getByRole('switch', { name: 'Show Verse of the Day' })
    expect(votdToggle).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(votdToggle)
    expect(onToggle).toHaveBeenCalledWith('votd', true)
  })

  it('Reset to Default calls onResetToDefault and onClose', () => {
    const onReset = vi.fn()
    const onClose = vi.fn()
    renderPanel({ onResetToDefault: onReset, onClose })
    fireEvent.click(screen.getByText('Reset to Default'))
    expect(onReset).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('Done closes the panel', () => {
    const onClose = vi.fn()
    renderPanel({ onClose })
    fireEvent.click(screen.getByText('Done'))
    expect(onClose).toHaveBeenCalled()
  })

  it('Escape closes panel', () => {
    const onClose = vi.fn()
    renderPanel({ onClose })
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('backdrop click closes panel', () => {
    const onClose = vi.fn()
    renderPanel({ onClose })
    // Backdrop is the aria-hidden div before the dialog
    const backdrop = screen.getByRole('dialog').previousElementSibling
    if (backdrop) {
      fireEvent.click(backdrop)
      expect(onClose).toHaveBeenCalled()
    }
  })

  it('has aria-live region for announcements', () => {
    renderPanel()
    const liveRegion = document.querySelector('[aria-live="polite"]')
    expect(liveRegion).toBeInTheDocument()
  })

  it('hidden widgets have dimmed opacity', () => {
    renderPanel({ hiddenWidgets: ['votd'] as WidgetId[] })
    // The votd item should have opacity-50
    const votdItem = screen.getByText('Verse of the Day').closest('[data-drag-item]')
    expect(votdItem).toHaveClass('opacity-50')
  })

  it('does not render when isOpen is false', () => {
    renderPanel({ isOpen: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keyboard: Space picks up item for reorder', () => {
    renderPanel()
    const items = screen.getAllByRole('generic').filter((el) => el.hasAttribute('data-drag-item'))
    fireEvent.keyDown(items[0], { key: ' ' })
    // Item should now have ring-2 class (keyboard active indicator)
    expect(items[0]).toHaveClass('ring-2')
  })

  it('keyboard: Escape cancels reorder', () => {
    renderPanel()
    const items = screen.getAllByRole('generic').filter((el) => el.hasAttribute('data-drag-item'))
    // Pick up
    fireEvent.keyDown(items[0], { key: ' ' })
    expect(items[0]).toHaveClass('ring-2')
    // Cancel
    fireEvent.keyDown(items[0], { key: 'Escape' })
    expect(items[0]).not.toHaveClass('ring-2')
  })
})
