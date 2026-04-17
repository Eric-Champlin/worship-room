import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BibleSearchEntry } from '../BibleSearchEntry'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderEntry() {
  return render(
    <MemoryRouter>
      <BibleSearchEntry />
    </MemoryRouter>,
  )
}

describe('BibleSearchEntry', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('search submits query to /bible/search', () => {
    renderEntry()
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'love' } })
    fireEvent.submit(input)
    expect(mockNavigate).toHaveBeenCalledWith('/bible/search?q=love')
  })

  it('search does nothing on empty submit', () => {
    renderEntry()
    const input = screen.getByRole('searchbox')
    fireEvent.submit(input)
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('search input has aria-label', () => {
    renderEntry()
    const input = screen.getByLabelText('Search the Bible')
    expect(input).toBeInTheDocument()
  })

  it('placeholder reads the exact spec string', () => {
    renderEntry()
    const input = screen.getByRole('searchbox') as HTMLInputElement
    expect(input.placeholder).toBe(
      'Search verses or go to a passage (e.g., John 3:16)',
    )
  })
})

describe('BibleSearchEntry — reference detection', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('navigates to book+chapter+verse on "John 3:16"', () => {
    renderEntry()
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'John 3:16' } })
    fireEvent.submit(input)
    expect(mockNavigate).toHaveBeenCalledWith('/bible/john/3?verse=16')
  })

  it('navigates to book+chapter only on "John 3"', () => {
    renderEntry()
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'John 3' } })
    fireEvent.submit(input)
    expect(mockNavigate).toHaveBeenCalledWith('/bible/john/3')
  })

  it('navigates to numbered-book reference "1 John 4:8"', () => {
    renderEntry()
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: '1 John 4:8' } })
    fireEvent.submit(input)
    expect(mockNavigate).toHaveBeenCalledWith('/bible/1-john/4?verse=8')
  })

  it('handles no-space numbered book "1John 4"', () => {
    renderEntry()
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: '1John 4' } })
    fireEvent.submit(input)
    expect(mockNavigate).toHaveBeenCalledWith('/bible/1-john/4')
  })

  it('falls through to full-text search on out-of-bounds chapter ("John 99")', () => {
    renderEntry()
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'John 99' } })
    fireEvent.submit(input)
    expect(mockNavigate).toHaveBeenCalledWith('/bible/search?q=John%2099')
  })

  it('falls through to full-text search on plain word query ("love")', () => {
    renderEntry()
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'love' } })
    fireEvent.submit(input)
    expect(mockNavigate).toHaveBeenCalledWith('/bible/search?q=love')
  })

  it('uses the spied useNavigate, not window.location', () => {
    renderEntry()
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'John 3:16' } })
    fireEvent.submit(input)
    expect(mockNavigate).toHaveBeenCalledTimes(1)
  })
})
