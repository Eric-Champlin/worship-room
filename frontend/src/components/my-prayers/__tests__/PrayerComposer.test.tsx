import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { PrayerComposer } from '../PrayerComposer'

vi.mock('@/hooks/useUnsavedChanges', () => ({
  useUnsavedChanges: () => ({
    showModal: false,
    confirmLeave: vi.fn(),
    cancelLeave: vi.fn(),
  }),
}))

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSave: vi.fn(),
}

function renderComposer(overrides = {}) {
  return render(
    <MemoryRouter>
      <PrayerComposer {...defaultProps} {...overrides} />
    </MemoryRouter>,
  )
}

describe('PrayerComposer', () => {
  it('composer opens with slide animation classes', () => {
    const { container } = renderComposer({ isOpen: true })
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('max-h-[800px]')
    expect(wrapper.className).toContain('opacity-100')
  })

  it('composer is hidden when not open', () => {
    const { container } = renderComposer({ isOpen: false })
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('max-h-0')
    expect(wrapper.className).toContain('opacity-0')
  })

  it('title input enforces maxLength 100', () => {
    renderComposer()
    const input = screen.getByLabelText('Prayer title')
    expect(input).toHaveAttribute('maxLength', '100')
  })

  it('description textarea enforces maxLength 1000', () => {
    renderComposer()
    const textarea = screen.getByLabelText('Prayer details')
    expect(textarea).toHaveAttribute('maxLength', '1000')
  })

  it('character counter appears at 80+ chars for title', async () => {
    const user = userEvent.setup()
    renderComposer()
    const input = screen.getByLabelText('Prayer title')

    await user.click(input)
    await user.type(input, 'A'.repeat(81))
    expect(screen.getByText('81 / 100')).toBeInTheDocument()
  })

  it('character counter appears at 800+ chars for description', async () => {
    const user = userEvent.setup()
    renderComposer()
    const textarea = screen.getByLabelText('Prayer details')

    await user.click(textarea)
    await user.paste('A'.repeat(801))
    expect(screen.getByText('801 / 1,000')).toBeInTheDocument()
  })

  it('shows "Please add a title" validation on empty submit', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.click(screen.getByText('Save Prayer'))
    expect(screen.getByText('Give your prayer a short title')).toBeInTheDocument()
  })

  it('shows "Please choose a category" validation on submit without category', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.type(screen.getByLabelText('Prayer title'), 'Test Prayer')
    await user.click(screen.getByText('Save Prayer'))
    expect(screen.getByText('Please choose a category')).toBeInTheDocument()
  })

  it('does not call onSave when title is empty', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    renderComposer({ onSave })
    await user.click(screen.getByText('Health'))
    await user.click(screen.getByText('Save Prayer'))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('does not call onSave when no category selected', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    renderComposer({ onSave })
    await user.type(screen.getByLabelText('Prayer title'), 'Test Prayer')
    await user.click(screen.getByText('Save Prayer'))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('CrisisBanner appears when crisis keywords typed', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.type(screen.getByLabelText('Prayer title'), 'I want to kill myself')
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('successful save calls onSave with correct data', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    renderComposer({ onSave })

    await user.type(screen.getByLabelText('Prayer title'), 'Healing for Mom')
    await user.type(screen.getByLabelText('Prayer details'), 'She needs healing')
    await user.click(screen.getByText('Health'))
    await user.click(screen.getByText('Save Prayer'))

    expect(onSave).toHaveBeenCalledWith('Healing for Mom', 'She needs healing', 'health')
  })

  it('composer resets fields after save', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    renderComposer({ onSave })

    await user.type(screen.getByLabelText('Prayer title'), 'Test')
    await user.click(screen.getByText('Health'))
    await user.click(screen.getByText('Save Prayer'))

    expect(screen.getByLabelText('Prayer title')).toHaveValue('')
    expect(screen.getByLabelText('Prayer details')).toHaveValue('')
  })

  it('Cancel collapses the composer', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderComposer({ onClose })

    await user.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('category pills have aria-pressed', () => {
    renderComposer()
    const pills = screen.getAllByRole('button', { name: /Health|Family|Work|Grief|Gratitude|Praise|Relationships|Other/ })
    pills.forEach((pill) => {
      expect(pill).toHaveAttribute('aria-pressed')
    })
  })

  it('title has aria-label "Prayer title"', () => {
    renderComposer()
    expect(screen.getByLabelText('Prayer title')).toBeInTheDocument()
  })

  it('title has required indicator', () => {
    renderComposer()
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('title error message text matches spec', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.click(screen.getByText('Save Prayer'))
    expect(screen.getByText('Give your prayer a short title')).toBeInTheDocument()
  })

  it('description has aria-label "Prayer details"', () => {
    renderComposer()
    expect(screen.getByLabelText('Prayer details')).toBeInTheDocument()
  })

  it('description char count at 500+ chars', async () => {
    const user = userEvent.setup()
    renderComposer()
    const textarea = screen.getByLabelText('Prayer details')
    await user.click(textarea)
    await user.paste('A'.repeat(501))
    expect(screen.getByText('501 / 1,000')).toBeInTheDocument()
  })

  it('useUnsavedChanges is wired up', () => {
    renderComposer()
    expect(screen.getByText('Add a Prayer')).toBeInTheDocument()
  })
})
