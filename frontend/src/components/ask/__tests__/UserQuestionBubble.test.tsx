import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UserQuestionBubble } from '../UserQuestionBubble'

describe('UserQuestionBubble', () => {
  it('renders question text', () => {
    render(<UserQuestionBubble question="Why does God allow suffering?" />)
    expect(screen.getByText('Why does God allow suffering?')).toBeInTheDocument()
  })

  it('has frosted glass styling with rounded-tr-sm corner notch', () => {
    const { container } = render(
      <UserQuestionBubble question="Test question" />,
    )
    const bubble = container.querySelector('.bg-white\\/\\[0\\.06\\]')
    expect(bubble).toBeInTheDocument()
    expect(bubble?.className).toContain('rounded-2xl')
    expect(bubble?.className).toContain('rounded-tr-sm')
    expect(bubble?.className).toContain('border-white/[0.12]')
    expect(bubble?.className).toContain('backdrop-blur-sm')
    expect(bubble?.className).toContain('max-w-[90%]')
    expect(bubble?.className).toContain('sm:max-w-[80%]')
    expect(bubble?.className).not.toContain('bg-primary/20')
  })

  it('is right-aligned via flex justify-end', () => {
    const { container } = render(
      <UserQuestionBubble question="Test" />,
    )
    const wrapper = container.firstElementChild
    expect(wrapper?.className).toContain('justify-end')
  })
})
