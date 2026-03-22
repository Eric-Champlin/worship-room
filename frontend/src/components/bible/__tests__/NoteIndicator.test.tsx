import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { NoteIndicator } from '../NoteIndicator'
import type { BibleNote } from '@/types/bible'

const mockNote: BibleNote = {
  id: 'note-1',
  book: 'genesis',
  chapter: 1,
  verseNumber: 1,
  text: 'This is a test note for the verse.',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('NoteIndicator', () => {
  const onEdit = vi.fn()
  const onDelete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders note indicator button', () => {
    render(<NoteIndicator note={mockNote} onEdit={onEdit} onDelete={onDelete} />)
    expect(screen.getByLabelText('Note on verse 1')).toBeInTheDocument()
  })

  it('has aria-expanded=false initially', () => {
    render(<NoteIndicator note={mockNote} onEdit={onEdit} onDelete={onDelete} />)
    expect(screen.getByLabelText('Note on verse 1')).toHaveAttribute('aria-expanded', 'false')
  })

  it('expands note text on click', () => {
    render(<NoteIndicator note={mockNote} onEdit={onEdit} onDelete={onDelete} />)
    fireEvent.click(screen.getByLabelText('Note on verse 1'))
    expect(screen.getByText('This is a test note for the verse.')).toBeInTheDocument()
    expect(screen.getByLabelText('Note on verse 1')).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows Edit and Delete buttons when expanded', () => {
    render(<NoteIndicator note={mockNote} onEdit={onEdit} onDelete={onDelete} />)
    fireEvent.click(screen.getByLabelText('Note on verse 1'))
    expect(screen.getByLabelText('Edit note')).toBeInTheDocument()
    expect(screen.getByLabelText('Delete note')).toBeInTheDocument()
  })

  it('calls onEdit when Edit is clicked', () => {
    render(<NoteIndicator note={mockNote} onEdit={onEdit} onDelete={onDelete} />)
    fireEvent.click(screen.getByLabelText('Note on verse 1'))
    fireEvent.click(screen.getByLabelText('Edit note'))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('shows delete confirmation', () => {
    render(<NoteIndicator note={mockNote} onEdit={onEdit} onDelete={onDelete} />)
    fireEvent.click(screen.getByLabelText('Note on verse 1'))
    fireEvent.click(screen.getByLabelText('Delete note'))
    expect(screen.getByText('Delete this note?')).toBeInTheDocument()
  })

  it('calls onDelete with note id on confirm', () => {
    render(<NoteIndicator note={mockNote} onEdit={onEdit} onDelete={onDelete} />)
    fireEvent.click(screen.getByLabelText('Note on verse 1'))
    fireEvent.click(screen.getByLabelText('Delete note'))
    // Confirm delete
    const deleteBtn = screen.getByRole('button', { name: 'Delete' })
    fireEvent.click(deleteBtn)
    expect(onDelete).toHaveBeenCalledWith('note-1')
  })

  it('cancels delete confirmation', () => {
    render(<NoteIndicator note={mockNote} onEdit={onEdit} onDelete={onDelete} />)
    fireEvent.click(screen.getByLabelText('Note on verse 1'))
    fireEvent.click(screen.getByLabelText('Delete note'))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    // Back to showing Edit/Delete buttons
    expect(screen.getByLabelText('Edit note')).toBeInTheDocument()
    expect(screen.queryByText('Delete this note?')).not.toBeInTheDocument()
  })

  it('collapses on click outside', () => {
    render(
      <div>
        <NoteIndicator note={mockNote} onEdit={onEdit} onDelete={onDelete} />
        <div data-testid="outside">Outside area</div>
      </div>,
    )
    // Expand
    fireEvent.click(screen.getByLabelText('Note on verse 1'))
    expect(screen.getByText('This is a test note for the verse.')).toBeInTheDocument()

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(screen.queryByText('This is a test note for the verse.')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Note on verse 1')).toHaveAttribute('aria-expanded', 'false')
  })
})
