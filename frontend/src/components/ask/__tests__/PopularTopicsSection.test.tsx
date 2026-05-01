import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PopularTopicsSection } from '../PopularTopicsSection'
import { POPULAR_TOPICS } from '@/constants/ask'

describe('PopularTopicsSection', () => {
  it('renders 5 cards', () => {
    render(<PopularTopicsSection onTopicClick={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(5)
  })

  it('each card shows topic name, description, and ChevronRight icon', () => {
    const { container } = render(<PopularTopicsSection onTopicClick={vi.fn()} />)
    for (const topic of POPULAR_TOPICS) {
      expect(screen.getByText(topic.topic)).toBeInTheDocument()
      expect(screen.getByText(topic.description)).toBeInTheDocument()
    }
    const icons = container.querySelectorAll('.lucide-chevron-right')
    expect(icons).toHaveLength(5)
  })

  it('clicking a card calls onTopicClick with starter question', () => {
    const onTopicClick = vi.fn()
    render(<PopularTopicsSection onTopicClick={onTopicClick} />)
    fireEvent.click(screen.getByText('Understanding Suffering'))
    expect(onTopicClick).toHaveBeenCalledWith('Why does God allow suffering?')
  })

  it('has "Popular Topics" heading', () => {
    render(<PopularTopicsSection onTopicClick={vi.fn()} />)
    expect(screen.getByText('Popular Topics')).toBeInTheDocument()
  })

  it('cards are FrostedCard buttons with upgraded opacity tiers', () => {
    render(<PopularTopicsSection onTopicClick={vi.fn()} />)
    const card = screen.getByText('Understanding Suffering').closest('button')
    expect(card?.tagName).toBe('BUTTON')
    expect(card?.className).toContain('rounded-3xl')
    expect(card?.className).toContain('bg-white/[0.07]')
    expect(card?.className).toContain('border-white/[0.12]')
    const title = screen.getByText('Understanding Suffering')
    expect(title.className).toContain('text-white')
    expect(title.className).not.toContain('text-white/80')
    const description = screen.getByText(/Why pain exists and how to endure it/i)
    expect(description.className).toContain('text-white/80')
    expect(description.className).not.toContain('text-white/50')
  })
})
