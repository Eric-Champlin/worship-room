import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DigDeeperSection } from '../DigDeeperSection'

const FOLLOW_UPS = [
  'What if my suffering doesn\'t end?',
  'How did Jesus handle pain?',
  'Can faith and therapy work together?',
]

describe('DigDeeperSection', () => {
  it('renders 3 chips', () => {
    render(<DigDeeperSection followUpQuestions={FOLLOW_UPS} onChipClick={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
  })

  it('each chip shows MessageCircle icon', () => {
    const { container } = render(
      <DigDeeperSection followUpQuestions={FOLLOW_UPS} onChipClick={vi.fn()} />,
    )
    const icons = container.querySelectorAll('.lucide-message-circle')
    expect(icons).toHaveLength(3)
  })

  it('chip text matches followUpQuestions', () => {
    render(<DigDeeperSection followUpQuestions={FOLLOW_UPS} onChipClick={vi.fn()} />)
    for (const q of FOLLOW_UPS) {
      expect(screen.getByRole('button', { name: q })).toBeInTheDocument()
    }
  })

  it('clicking chip calls onChipClick with question text', () => {
    const onChipClick = vi.fn()
    render(<DigDeeperSection followUpQuestions={FOLLOW_UPS} onChipClick={onChipClick} />)
    fireEvent.click(screen.getByRole('button', { name: FOLLOW_UPS[1] }))
    expect(onChipClick).toHaveBeenCalledWith(FOLLOW_UPS[1])
  })

  it('chips are disabled when disabled prop is true', () => {
    render(
      <DigDeeperSection followUpQuestions={FOLLOW_UPS} onChipClick={vi.fn()} disabled />,
    )
    const buttons = screen.getAllByRole('button')
    for (const btn of buttons) {
      expect(btn).toBeDisabled()
    }
  })

  it('chips stack vertically on mobile (flex-col class present)', () => {
    const { container } = render(
      <DigDeeperSection followUpQuestions={FOLLOW_UPS} onChipClick={vi.fn()} />,
    )
    const chipsContainer = container.querySelector('.flex-col')
    expect(chipsContainer).toBeInTheDocument()
  })

  it('section has "Dig Deeper" heading', () => {
    render(<DigDeeperSection followUpQuestions={FOLLOW_UPS} onChipClick={vi.fn()} />)
    expect(screen.getByText('Dig Deeper')).toBeInTheDocument()
  })

  it('renders nothing when followUpQuestions is empty', () => {
    const { container } = render(
      <DigDeeperSection followUpQuestions={[]} onChipClick={vi.fn()} />,
    )
    expect(container.innerHTML).toBe('')
  })
})
