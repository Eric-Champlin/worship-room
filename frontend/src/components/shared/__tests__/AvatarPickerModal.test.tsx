import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AvatarPickerModal } from '../AvatarPickerModal'
import type { BadgeData } from '@/types/dashboard'
import { FRESH_ACTIVITY_COUNTS } from '@/constants/dashboard/badges'

const FRESH_BADGES: BadgeData = {
  earned: {},
  newlyEarned: [],
  activityCounts: { ...FRESH_ACTIVITY_COUNTS },
}

const DEFAULT_PROPS = {
  isOpen: true,
  onClose: vi.fn(),
  currentAvatarId: 'nature-dove',
  badges: FRESH_BADGES,
  onSave: vi.fn(),
  displayName: 'Sarah Miller',
  userId: 'user-1',
}

function renderModal(overrides?: Partial<typeof DEFAULT_PROPS & { currentAvatarUrl: string }>) {
  return render(<AvatarPickerModal {...DEFAULT_PROPS} {...overrides} />)
}

describe('AvatarPickerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders with overlay when isOpen=true', () => {
    renderModal()
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('Choose Your Avatar')).toBeTruthy()
  })

  it('renders nothing when isOpen=false', () => {
    renderModal({ isOpen: false })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows all 16 presets in 4 categories', () => {
    renderModal()
    expect(screen.getByText('Nature')).toBeTruthy()
    expect(screen.getByText('Faith')).toBeTruthy()
    expect(screen.getByText('Water')).toBeTruthy()
    expect(screen.getByText('Light')).toBeTruthy()
    // Count preset avatar names
    const presetNames = ['Dove', 'Tree', 'Mountain', 'Sunrise', 'Cross', 'Ichthys', 'Flame', 'Crown', 'Wave', 'Raindrop', 'River', 'Anchor', 'Star', 'Candle', 'Lighthouse', 'Rainbow']
    for (const name of presetNames) {
      expect(screen.getByText(name)).toBeTruthy()
    }
  })

  it('shows 4 unlockable avatars section', () => {
    renderModal()
    expect(screen.getByText('Unlockable Avatars')).toBeTruthy()
  })

  it('selecting a preset updates ring and Save calls onSave', () => {
    renderModal()
    const crossBtn = screen.getByLabelText('Cross avatar')
    fireEvent.click(crossBtn)
    expect(crossBtn.className).toContain('ring-2')

    const saveBtn = screen.getByText('Save')
    fireEvent.click(saveBtn)
    expect(DEFAULT_PROPS.onSave).toHaveBeenCalledWith('faith-cross')
  })

  it('locked unlockable is disabled', () => {
    renderModal()
    const goldenDove = screen.getByLabelText(/Golden Dove/)
    expect(goldenDove).toBeDisabled()
  })

  it('unlocked unlockable is selectable', () => {
    const badges: BadgeData = {
      ...FRESH_BADGES,
      earned: { streak_365: { earnedAt: '2026-01-01' } },
    }
    renderModal({ badges })
    const goldenDove = screen.getByLabelText('Golden Dove avatar')
    expect(goldenDove).not.toBeDisabled()
    fireEvent.click(goldenDove)
    expect(goldenDove.className).toContain('ring-2')
  })

  it('Escape key closes modal', () => {
    renderModal()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(DEFAULT_PROPS.onClose).toHaveBeenCalled()
  })

  it('has role="dialog" and aria-labelledby', () => {
    renderModal()
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-labelledby')).toBe('avatar-picker-title')
  })

  it('tabs use role="tablist" pattern', () => {
    renderModal()
    expect(screen.getByRole('tablist')).toBeTruthy()
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(2)
    expect(tabs[0].textContent).toBe('Presets')
    expect(tabs[1].textContent).toBe('Upload Photo')
  })

  it('upload tab shows file button', () => {
    renderModal()
    fireEvent.click(screen.getByText('Upload Photo'))
    expect(screen.getByText('Choose File')).toBeTruthy()
  })

  it('upload tab: remove photo visible when custom photo is current', () => {
    renderModal({ currentAvatarId: 'custom', currentAvatarUrl: 'data:image/jpeg;base64,test' })
    fireEvent.click(screen.getByText('Upload Photo'))
    expect(screen.getByText('Remove Photo')).toBeTruthy()
  })

  it('mobile: no drag-and-drop zone (hidden via CSS class)', () => {
    renderModal()
    fireEvent.click(screen.getByText('Upload Photo'))
    const dropZone = screen.getByText(/drag and drop/)
    // Check that it has the 'hidden' class for mobile (sm:flex means hidden on mobile)
    expect(dropZone.className).toContain('hidden')
    expect(dropZone.className).toContain('sm:flex')
  })

  it('close button calls onClose', () => {
    renderModal()
    fireEvent.click(screen.getByLabelText('Close avatar picker'))
    expect(DEFAULT_PROPS.onClose).toHaveBeenCalled()
  })

  it('presets use role="radiogroup" with role="radio" items', () => {
    renderModal()
    expect(screen.getByRole('radiogroup', { name: 'Avatar presets' })).toBeTruthy()
    const radios = screen.getAllByRole('radio')
    expect(radios.length).toBeGreaterThanOrEqual(16) // 16 presets + unlockables
  })

  it('selected preset has aria-checked=true, others have aria-checked=false', () => {
    renderModal({ currentAvatarId: 'nature-dove' })
    const doveBtn = screen.getByLabelText('Dove avatar')
    expect(doveBtn.getAttribute('aria-checked')).toBe('true')
    const crossBtn = screen.getByLabelText('Cross avatar')
    expect(crossBtn.getAttribute('aria-checked')).toBe('false')
  })

  it('arrow key navigates between presets', () => {
    renderModal({ currentAvatarId: 'nature-dove' })
    const doveBtn = screen.getByLabelText('Dove avatar')
    fireEvent.keyDown(doveBtn, { key: 'ArrowRight' })
    // After ArrowRight, the next preset (Tree) should be selected
    const treeBtn = screen.getByLabelText('Tree avatar')
    expect(treeBtn.getAttribute('aria-checked')).toBe('true')
    expect(doveBtn.getAttribute('aria-checked')).toBe('false')
  })

  it('does not close modal on save failure', () => {
    const throwOnSave = vi.fn(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError')
    })
    renderModal({ onSave: throwOnSave })
    fireEvent.click(screen.getByText('Save'))
    // Modal should still be open
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText(/storage is full/)).toBeTruthy()
    // onClose should NOT have been called
    expect(DEFAULT_PROPS.onClose).not.toHaveBeenCalled()
  })
})
