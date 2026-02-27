import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AnsweredBadge } from '../AnsweredBadge'

describe('AnsweredBadge', () => {
  it('renders "Answered Prayer" badge text', () => {
    render(<AnsweredBadge answeredText={null} answeredAt={null} />)
    expect(screen.getByText('Answered Prayer')).toBeInTheDocument()
  })

  it('renders praise text in serif italic when provided', () => {
    render(
      <AnsweredBadge
        answeredText="God is faithful!"
        answeredAt="2026-02-20T16:00:00Z"
      />,
    )
    expect(screen.getByText('God is faithful!')).toBeInTheDocument()
    const praiseEl = screen.getByText('God is faithful!')
    expect(praiseEl).toHaveClass('font-serif', 'italic')
  })

  it('renders date when answeredAt is provided', () => {
    render(
      <AnsweredBadge answeredText={null} answeredAt="2026-02-20T16:00:00Z" />,
    )
    expect(screen.getByText('Feb 20, 2026')).toBeInTheDocument()
  })

  it('does not render praise or date when not provided', () => {
    const { container } = render(
      <AnsweredBadge answeredText={null} answeredAt={null} />,
    )
    // Only the badge span should exist
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs).toHaveLength(0)
  })
})
