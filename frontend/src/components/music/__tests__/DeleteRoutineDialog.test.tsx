import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DeleteRoutineDialog } from '../DeleteRoutineDialog'

vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: () => ({ current: null }),
}))

describe('DeleteRoutineDialog — Step 10 visual migration', () => {
  const defaultProps = {
    routineName: 'Test Routine',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  it('dialog has role="alertdialog"', () => {
    render(<DeleteRoutineDialog {...defaultProps} />)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('dialog has aria-modal="true"', () => {
    render(<DeleteRoutineDialog {...defaultProps} />)
    expect(screen.getByRole('alertdialog')).toHaveAttribute('aria-modal', 'true')
  })

  it('heading row contains AlertTriangle icon (aria-hidden svg)', () => {
    render(<DeleteRoutineDialog {...defaultProps} />)
    const dialog = screen.getByRole('alertdialog')
    const svg = dialog.querySelector('svg[aria-hidden="true"]')
    expect(svg).toBeInTheDocument()
  })

  it('Delete CTA uses canonical muted destructive chrome', () => {
    render(<DeleteRoutineDialog {...defaultProps} />)
    const deleteBtn = screen.getByRole('button', { name: /^Delete$/ })
    expect(deleteBtn.className).toContain('bg-red-950/30')
    expect(deleteBtn.className).toContain('border-red-400/30')
    expect(deleteBtn.className).toContain('text-red-100')
  })

  it('Delete CTA does NOT have bg-red-700', () => {
    render(<DeleteRoutineDialog {...defaultProps} />)
    const deleteBtn = screen.getByRole('button', { name: /^Delete$/ })
    expect(deleteBtn.className).not.toContain('bg-red-700')
  })

  it('Delete CTA has min-h-[44px]', () => {
    render(<DeleteRoutineDialog {...defaultProps} />)
    const deleteBtn = screen.getByRole('button', { name: /^Delete$/ })
    expect(deleteBtn.className).toContain('min-h-[44px]')
  })

  it('Cancel CTA canonical secondary with min-h-[44px]', () => {
    render(<DeleteRoutineDialog {...defaultProps} />)
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i })
    expect(cancelBtn.className).toContain('bg-white/10')
    expect(cancelBtn.className).toContain('hover:bg-white/15')
    expect(cancelBtn.className).toContain('min-h-[44px]')
  })

  it('dialog wrapper has border-white/[0.12]', () => {
    render(<DeleteRoutineDialog {...defaultProps} />)
    const dialog = screen.getByRole('alertdialog')
    expect(dialog.className).toContain('border-white/[0.12]')
  })

  it('confirm copy preserved — heading and description', () => {
    render(<DeleteRoutineDialog {...defaultProps} />)
    expect(screen.getByText('Delete Test Routine?')).toBeInTheDocument()
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument()
  })
})
