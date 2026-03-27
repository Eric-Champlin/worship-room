import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { BookCompletionCard } from '../BookCompletionCard'

function renderCard(props: Partial<React.ComponentProps<typeof BookCompletionCard>> = {}) {
  const defaultProps = {
    bookName: 'Genesis',
    bookSlug: 'genesis',
    onDismiss: vi.fn(),
    ...props,
  }
  return render(
    <MemoryRouter>
      <BookCompletionCard {...defaultProps} />
    </MemoryRouter>,
  )
}

describe('BookCompletionCard', () => {
  it('renders book name and checkmark', () => {
    renderCard({ bookName: 'Genesis' })
    expect(screen.getByText("You've completed Genesis!")).toBeInTheDocument()
  })

  it('"Start the next book" links to correct book', () => {
    renderCard({ bookSlug: 'genesis' })
    const link = screen.getByRole('link', { name: /Start the next book/ })
    expect(link).toHaveAttribute('href', '/bible/exodus/1')
  })

  it('hides "Start the next book" for Revelation', () => {
    renderCard({ bookSlug: 'revelation', bookName: 'Revelation' })
    expect(screen.queryByText(/Start the next book/)).not.toBeInTheDocument()
  })

  it('"View your reading progress" links to /insights', () => {
    renderCard()
    const link = screen.getByRole('link', { name: /View your reading progress/ })
    expect(link).toHaveAttribute('href', '/insights')
  })

  it('dismiss button calls onDismiss', () => {
    const onDismiss = vi.fn()
    renderCard({ onDismiss })
    fireEvent.click(screen.getByRole('button', { name: /Dismiss/ }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
