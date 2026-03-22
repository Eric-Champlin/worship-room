import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { NoteEditor } from '../NoteEditor'
import type { BibleNote } from '@/types/bible'

vi.mock('@/components/daily/CrisisBanner', () => ({
  CrisisBanner: ({ text }: { text: string }) =>
    text.includes('kill myself') ? <div data-testid="crisis-banner">Crisis resources</div> : null,
}))

const defaultProps = {
  verseNumber: 1,
  onSave: vi.fn().mockReturnValue(true),
  onCancel: vi.fn(),
}

const existingNote: BibleNote = {
  id: 'note-1',
  book: 'genesis',
  chapter: 1,
  verseNumber: 1,
  text: 'Existing note text',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('NoteEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders textarea with placeholder', () => {
    render(<NoteEditor {...defaultProps} />)
    expect(screen.getByPlaceholderText('Add a note about this verse...')).toBeInTheDocument()
  })

  it('textarea has aria-label', () => {
    render(<NoteEditor {...defaultProps} />)
    expect(screen.getByLabelText('Personal note for verse 1')).toBeInTheDocument()
  })

  it('shows character counter', () => {
    render(<NoteEditor {...defaultProps} />)
    expect(screen.getByText('0/300')).toBeInTheDocument()
  })

  it('character counter updates on typing', () => {
    render(<NoteEditor {...defaultProps} />)
    const textarea = screen.getByPlaceholderText('Add a note about this verse...')
    fireEvent.change(textarea, { target: { value: 'Hello' } })
    expect(screen.getByText('5/300')).toBeInTheDocument()
  })

  it('character counter turns red near limit', () => {
    render(<NoteEditor {...defaultProps} />)
    const textarea = screen.getByPlaceholderText('Add a note about this verse...')
    fireEvent.change(textarea, { target: { value: 'x'.repeat(285) } })
    const counter = screen.getByText('285/300')
    expect(counter).toHaveClass('text-danger')
  })

  it('Save button is disabled when text is empty', () => {
    render(<NoteEditor {...defaultProps} />)
    const saveBtn = screen.getByRole('button', { name: 'Save' })
    expect(saveBtn).toBeDisabled()
  })

  it('calls onSave with text when Save is clicked', () => {
    render(<NoteEditor {...defaultProps} />)
    const textarea = screen.getByPlaceholderText('Add a note about this verse...')
    fireEvent.change(textarea, { target: { value: 'My note' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(defaultProps.onSave).toHaveBeenCalledWith('My note')
  })

  it('calls onCancel when Cancel is clicked', () => {
    render(<NoteEditor {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1)
  })

  it('pre-fills textarea with existing note text', () => {
    render(<NoteEditor {...defaultProps} existingNote={existingNote} />)
    const textarea = screen.getByPlaceholderText('Add a note about this verse...')
    expect(textarea).toHaveValue('Existing note text')
  })

  it('shows Delete button for existing notes', () => {
    const onDelete = vi.fn()
    render(
      <NoteEditor {...defaultProps} existingNote={existingNote} onDelete={onDelete} />,
    )
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('shows inline delete confirmation', () => {
    const onDelete = vi.fn()
    render(
      <NoteEditor {...defaultProps} existingNote={existingNote} onDelete={onDelete} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByText('Delete this note?')).toBeInTheDocument()
  })

  it('calls onDelete when confirming delete', () => {
    const onDelete = vi.fn()
    render(
      <NoteEditor {...defaultProps} existingNote={existingNote} onDelete={onDelete} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    // Click the confirmation Delete button (second one)
    const deleteButtons = screen.getAllByRole('button', { name: /Delete/i })
    fireEvent.click(deleteButtons[deleteButtons.length - 1])
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('shows CrisisBanner on crisis keywords', () => {
    render(<NoteEditor {...defaultProps} />)
    const textarea = screen.getByPlaceholderText('Add a note about this verse...')
    fireEvent.change(textarea, { target: { value: 'I want to kill myself' } })
    expect(screen.getByTestId('crisis-banner')).toBeInTheDocument()
  })

  it('rejects input beyond maxLength', () => {
    render(<NoteEditor {...defaultProps} />)
    const textarea = screen.getByPlaceholderText('Add a note about this verse...')
    // Input at exactly 300 is accepted
    fireEvent.change(textarea, { target: { value: 'x'.repeat(300) } })
    expect(screen.getByText('300/300')).toBeInTheDocument()
    // Input beyond 300 is rejected (stays at previous value)
    fireEvent.change(textarea, { target: { value: 'x'.repeat(301) } })
    expect(screen.getByText('300/300')).toBeInTheDocument()
  })
})
