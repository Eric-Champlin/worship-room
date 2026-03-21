import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { SaveToPrayerListForm } from '../SaveToPrayerListForm'
import { getPrayers } from '@/services/prayer-list-storage'

function renderForm(props: Partial<Parameters<typeof SaveToPrayerListForm>[0]> = {}) {
  const defaultProps = {
    topicText: 'Help me with anxiety and worry',
    prayerText: 'Dear God, help me find peace...',
    onSave: vi.fn(),
    onCancel: vi.fn(),
    ...props,
  }

  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <SaveToPrayerListForm {...defaultProps} />
      </ToastProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('SaveToPrayerListForm', () => {
  it('pre-fills title from topic text (first 8 words)', () => {
    renderForm({ topicText: 'I am struggling with anxiety and worry about my future plans' })

    const input = screen.getByLabelText('Prayer title') as HTMLInputElement
    expect(input.value).toBe('I am struggling with anxiety and worry about')
  })

  it('defaults to "My prayer" when topic is empty', () => {
    renderForm({ topicText: '' })

    const input = screen.getByLabelText('Prayer title') as HTMLInputElement
    expect(input.value).toBe('My prayer')
  })

  it('defaults to "My prayer" when topic is very short', () => {
    renderForm({ topicText: 'hi' })

    const input = screen.getByLabelText('Prayer title') as HTMLInputElement
    expect(input.value).toBe('My prayer')
  })

  it('shows 8 category pills', () => {
    renderForm()

    expect(screen.getByText('Health')).toBeInTheDocument()
    expect(screen.getByText('Family')).toBeInTheDocument()
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('Grief')).toBeInTheDocument()
    expect(screen.getByText('Gratitude')).toBeInTheDocument()
    expect(screen.getByText('Praise')).toBeInTheDocument()
    expect(screen.getByText('Relationships')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
  })

  it('save button disabled without category', () => {
    renderForm()

    const saveBtn = screen.getByText('Save')
    expect(saveBtn).toBeDisabled()
  })

  it('save button enabled after selecting category', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByText('Health'))
    expect(screen.getByText('Save')).not.toBeDisabled()
  })

  it('saves prayer to localStorage on submit', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderForm({ onSave })

    await user.click(screen.getByText('Health'))
    await user.click(screen.getByText('Save'))

    const prayers = getPrayers()
    expect(prayers).toHaveLength(1)
    expect(prayers[0].category).toBe('health')
    expect(prayers[0].description).toBe('Dear God, help me find peace...')
    expect(onSave).toHaveBeenCalledOnce()
  })

  it('calls onCancel when cancel clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderForm({ onCancel })

    await user.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('has crisis detection on title input', async () => {
    const user = userEvent.setup()
    renderForm()

    const input = screen.getByLabelText('Prayer title')
    await user.clear(input)
    await user.type(input, 'I want to kill myself')

    // CrisisBanner should appear
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
