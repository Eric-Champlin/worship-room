import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { BibleSearchEntry } from '../BibleSearchEntry'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

describe('BibleSearchEntry', () => {
  it('search submits query to /bible/search', () => {
    render(
      <MemoryRouter>
        <BibleSearchEntry />
      </MemoryRouter>
    )
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'love' } })
    fireEvent.submit(input)
    expect(mockNavigate).toHaveBeenCalledWith('/bible/search?q=love')
  })

  it('search does nothing on empty submit', () => {
    mockNavigate.mockClear()
    render(
      <MemoryRouter>
        <BibleSearchEntry />
      </MemoryRouter>
    )
    const input = screen.getByRole('searchbox')
    fireEvent.submit(input)
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('search input has aria-label', () => {
    render(
      <MemoryRouter>
        <BibleSearchEntry />
      </MemoryRouter>
    )
    const input = screen.getByLabelText('Search the Bible')
    expect(input).toBeInTheDocument()
  })
})
