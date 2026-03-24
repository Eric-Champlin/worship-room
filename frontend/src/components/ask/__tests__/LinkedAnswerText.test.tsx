import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LinkedAnswerText } from '../LinkedAnswerText'

function renderLinkedText(text: string) {
  return render(
    <MemoryRouter>
      <LinkedAnswerText text={text} />
    </MemoryRouter>,
  )
}

describe('LinkedAnswerText', () => {
  it('renders plain text when no references', () => {
    renderLinkedText('This is a plain text with no Bible references.')
    expect(screen.getByText('This is a plain text with no Bible references.')).toBeInTheDocument()
  })

  it('creates link for "Romans 8:28"', () => {
    renderLinkedText('As Paul writes in Romans 8:28, God works through all things.')
    const link = screen.getByRole('link', { name: 'Romans 8:28' })
    expect(link).toBeInTheDocument()
  })

  it('link has text-primary-lt class', () => {
    renderLinkedText('See Romans 8:28 for details.')
    const link = screen.getByRole('link', { name: 'Romans 8:28' })
    expect(link.className).toContain('text-primary-lt')
  })

  it('link navigates to correct Bible reader URL', () => {
    renderLinkedText('Read Romans 8:28 today.')
    const link = screen.getByRole('link', { name: 'Romans 8:28' })
    expect(link).toHaveAttribute('href', '/bible/romans/8#verse-28')
  })

  it('handles multiple references in one paragraph', () => {
    renderLinkedText('Read Romans 8:28 and Psalm 34:18 for comfort.')
    const link1 = screen.getByRole('link', { name: 'Romans 8:28' })
    const link2 = screen.getByRole('link', { name: 'Psalm 34:18' })
    expect(link1).toBeInTheDocument()
    expect(link2).toBeInTheDocument()
  })

  it('renders non-reference text as plain text', () => {
    renderLinkedText('As Paul writes in Romans 8:28, God works through all things.')
    expect(screen.getByText(/As Paul writes in/)).toBeInTheDocument()
    expect(screen.getByText(/, God works through all things\./)).toBeInTheDocument()
  })
})
