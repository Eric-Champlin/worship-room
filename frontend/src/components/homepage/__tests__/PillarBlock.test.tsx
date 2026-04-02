import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { PillarBlock } from '../PillarBlock'
import { PILLARS } from '../pillar-data'

vi.mock('@/hooks/useScrollReveal', () => ({
  useScrollReveal: () => ({ ref: { current: null }, isVisible: true }),
  staggerDelay: (i: number, base = 100, initial = 0) => ({
    transitionDelay: `${initial + i * base}ms`,
  }),
}))

const healingPillar = PILLARS[0]

describe('PillarBlock', () => {
  it('renders pillar title', () => {
    render(<PillarBlock pillar={healingPillar} isVisible />)
    expect(
      screen.getByRole('heading', { name: 'Healing' })
    ).toBeInTheDocument()
  })

  it('renders pillar subtitle', () => {
    render(<PillarBlock pillar={healingPillar} isVisible />)
    expect(
      screen.getByText('Daily practices for your inner life')
    ).toBeInTheDocument()
  })

  it('renders correct Lucide icon', () => {
    const { container } = render(<PillarBlock pillar={healingPillar} isVisible />)
    const svg = container.querySelector('svg[aria-hidden="true"]')
    expect(svg).toBeInTheDocument()
  })

  it('renders all features', () => {
    render(<PillarBlock pillar={healingPillar} isVisible />)
    for (const feature of healingPillar.features) {
      expect(screen.getByText(feature.name)).toBeInTheDocument()
    }
  })

  it('first item expanded by default', () => {
    render(<PillarBlock pillar={healingPillar} isVisible />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true')
    expect(buttons[1]).toHaveAttribute('aria-expanded', 'false')
  })

  it('clicking second item expands it and collapses first', async () => {
    const user = userEvent.setup()
    render(<PillarBlock pillar={healingPillar} isVisible />)
    const buttons = screen.getAllByRole('button')

    await user.click(buttons[1])

    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false')
    expect(buttons[1]).toHaveAttribute('aria-expanded', 'true')
  })

  it('clicking expanded item collapses it', async () => {
    const user = userEvent.setup()
    render(<PillarBlock pillar={healingPillar} isVisible />)
    const buttons = screen.getAllByRole('button')

    await user.click(buttons[0])

    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false')
  })
})
