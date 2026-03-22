import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { GratitudeWidget } from '../GratitudeWidget'
import { getLocalDateString } from '@/utils/date'
import type { GratitudeEntry } from '@/services/gratitude-storage'

const STORAGE_KEY = 'wr_gratitude_entries'

function renderWidget(onGratitudeSaved?: () => void) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <GratitudeWidget onGratitudeSaved={onGratitudeSaved} />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

function seedTodayEntry(items: string[] = ['Sunshine', 'Good coffee']): GratitudeEntry {
  const entry: GratitudeEntry = {
    id: 'test-entry-1',
    date: getLocalDateString(),
    items,
    createdAt: new Date().toISOString(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify([entry]))
  return entry
}

describe('GratitudeWidget', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('wr_auth_simulated', 'true')
    localStorage.setItem('wr_user_name', 'Eric')
  })

  it('renders 3 input fields with correct aria-labels', () => {
    renderWidget()
    expect(screen.getByLabelText('Gratitude item 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Gratitude item 2')).toBeInTheDocument()
    expect(screen.getByLabelText('Gratitude item 3')).toBeInTheDocument()
  })

  it('shows rotating placeholders', () => {
    renderWidget()
    const inputs = screen.getAllByRole('textbox')
    // All 3 should have placeholder text
    inputs.forEach((input) => {
      expect(input).toHaveAttribute('placeholder')
      expect(input.getAttribute('placeholder')).not.toBe('')
    })
  })

  it('save button is disabled when all inputs are empty', () => {
    renderWidget()
    const saveBtn = screen.getByRole('button', { name: /save/i })
    expect(saveBtn).toBeDisabled()
  })

  it('save button is enabled when at least one input has text', () => {
    renderWidget()
    const input1 = screen.getByLabelText('Gratitude item 1')
    fireEvent.change(input1, { target: { value: 'Thankful for today' } })
    const saveBtn = screen.getByRole('button', { name: /save/i })
    expect(saveBtn).toBeEnabled()
  })

  it('saves entry and shows saved state with checkmarks', () => {
    renderWidget()
    const input1 = screen.getByLabelText('Gratitude item 1')
    fireEvent.change(input1, { target: { value: 'Thankful for sunshine' } })

    const saveBtn = screen.getByRole('button', { name: /save/i })
    fireEvent.click(saveBtn)

    // Should now show saved state with the text
    expect(screen.getByText('Thankful for sunshine')).toBeInTheDocument()
    // Edit button should appear
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    // Input fields should be gone
    expect(screen.queryByLabelText('Gratitude item 1')).not.toBeInTheDocument()
  })

  it('calls onGratitudeSaved on first save', () => {
    const onSaved = vi.fn()
    renderWidget(onSaved)

    const input1 = screen.getByLabelText('Gratitude item 1')
    fireEvent.change(input1, { target: { value: 'Test' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(onSaved).toHaveBeenCalledOnce()
  })

  it('does not call onGratitudeSaved on edit re-save', () => {
    seedTodayEntry(['Original'])
    const onSaved = vi.fn()
    renderWidget(onSaved)

    // Should show saved state. Click Edit.
    const editBtn = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editBtn)

    // Now in editing mode, save again
    const saveBtn = screen.getByRole('button', { name: /save/i })
    fireEvent.click(saveBtn)

    expect(onSaved).not.toHaveBeenCalled()
  })

  it('loads existing entry on mount and shows saved state', () => {
    seedTodayEntry(['Sunshine', 'Good coffee'])
    renderWidget()

    expect(screen.getByText('Sunshine')).toBeInTheDocument()
    expect(screen.getByText('Good coffee')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
  })

  it('edit button re-enables inputs with pre-filled values', () => {
    seedTodayEntry(['Sunshine', 'Good coffee'])
    renderWidget()

    fireEvent.click(screen.getByRole('button', { name: /edit/i }))

    const input1 = screen.getByLabelText('Gratitude item 1') as HTMLInputElement
    const input2 = screen.getByLabelText('Gratitude item 2') as HTMLInputElement
    expect(input1.value).toBe('Sunshine')
    expect(input2.value).toBe('Good coffee')
  })

  it('shows crisis banner when crisis keyword detected', () => {
    renderWidget()
    const input1 = screen.getByLabelText('Gratitude item 1')
    fireEvent.change(input1, { target: { value: 'I want to kill myself' } })

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('does not block save when crisis keyword is present', () => {
    renderWidget()
    const input1 = screen.getByLabelText('Gratitude item 1')
    fireEvent.change(input1, { target: { value: 'I want to kill myself' } })

    const saveBtn = screen.getByRole('button', { name: /save/i })
    expect(saveBtn).toBeEnabled()
    fireEvent.click(saveBtn)

    // Should show saved state
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
  })

  it('enforces maxLength of 150 on inputs', () => {
    renderWidget()
    const input1 = screen.getByLabelText('Gratitude item 1')
    expect(input1).toHaveAttribute('maxLength', '150')
  })

  it('keyboard navigation works through all inputs and buttons', () => {
    renderWidget()
    const input1 = screen.getByLabelText('Gratitude item 1')
    const input2 = screen.getByLabelText('Gratitude item 2')
    const input3 = screen.getByLabelText('Gratitude item 3')
    const saveBtn = screen.getByRole('button', { name: /save/i })

    // All should be focusable (not have tabIndex -1)
    expect(input1.tabIndex).not.toBe(-1)
    expect(input2.tabIndex).not.toBe(-1)
    expect(input3.tabIndex).not.toBe(-1)
    expect(saveBtn.tabIndex).not.toBe(-1)
  })
})
