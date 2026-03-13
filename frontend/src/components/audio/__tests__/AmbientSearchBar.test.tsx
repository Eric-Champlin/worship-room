import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { AmbientSearchBar } from '../AmbientSearchBar'

describe('AmbientSearchBar', () => {
  it('renders with placeholder text', () => {
    render(
      <AmbientSearchBar searchQuery="" onSearchChange={vi.fn()} onClear={vi.fn()} />,
    )
    expect(
      screen.getByPlaceholderText('Search sounds and scenes...'),
    ).toBeInTheDocument()
  })

  it('has correct aria attributes', () => {
    render(
      <AmbientSearchBar searchQuery="" onSearchChange={vi.fn()} onClear={vi.fn()} />,
    )
    const input = screen.getByRole('searchbox')
    expect(input).toHaveAttribute('aria-label', 'Search sounds and scenes')
  })

  it('clear button appears when text is entered', () => {
    const { rerender } = render(
      <AmbientSearchBar searchQuery="" onSearchChange={vi.fn()} onClear={vi.fn()} />,
    )
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument()

    rerender(
      <AmbientSearchBar searchQuery="rain" onSearchChange={vi.fn()} onClear={vi.fn()} />,
    )
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument()
  })

  it('calls onSearchChange when typing', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <AmbientSearchBar searchQuery="" onSearchChange={onChange} onClear={vi.fn()} />,
    )

    await user.type(screen.getByRole('searchbox'), 'r')
    expect(onChange).toHaveBeenCalledWith('r')
  })

  it('calls onClear when clear button clicked', async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()
    render(
      <AmbientSearchBar searchQuery="rain" onSearchChange={vi.fn()} onClear={onClear} />,
    )

    await user.click(screen.getByLabelText('Clear search'))
    expect(onClear).toHaveBeenCalledOnce()
  })
})
