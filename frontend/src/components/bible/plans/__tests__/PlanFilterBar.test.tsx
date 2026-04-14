import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PlanFilterBar } from '../PlanFilterBar'

const DEFAULT_PROPS = {
  theme: 'all' as const,
  duration: 'any' as const,
  onThemeChange: vi.fn(),
  onDurationChange: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PlanFilterBar', () => {
  it('renders all 7 theme pills', () => {
    render(<PlanFilterBar {...DEFAULT_PROPS} />)
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Comfort')).toBeInTheDocument()
    expect(screen.getByText('Foundation')).toBeInTheDocument()
    expect(screen.getByText('Emotional')).toBeInTheDocument()
    expect(screen.getByText('Sleep')).toBeInTheDocument()
    expect(screen.getByText('Wisdom')).toBeInTheDocument()
    expect(screen.getByText('Prayer')).toBeInTheDocument()
  })

  it('renders all 4 duration pills', () => {
    render(<PlanFilterBar {...DEFAULT_PROPS} />)
    expect(screen.getByText('Any length')).toBeInTheDocument()
    expect(screen.getByText('7 days or less')).toBeInTheDocument()
    expect(screen.getByText(/8.21 days/)).toBeInTheDocument()
    expect(screen.getByText('22+ days')).toBeInTheDocument()
  })

  it('active theme pill has aria-pressed true', () => {
    render(<PlanFilterBar {...DEFAULT_PROPS} theme="comfort" />)
    expect(screen.getByText('Comfort')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('All')).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking theme pill calls onThemeChange', async () => {
    const user = userEvent.setup()
    render(<PlanFilterBar {...DEFAULT_PROPS} />)
    await user.click(screen.getByText('Comfort'))
    expect(DEFAULT_PROPS.onThemeChange).toHaveBeenCalledWith('comfort')
  })

  it('clicking duration pill calls onDurationChange', async () => {
    const user = userEvent.setup()
    render(<PlanFilterBar {...DEFAULT_PROPS} />)
    await user.click(screen.getByText('7 days or less'))
    expect(DEFAULT_PROPS.onDurationChange).toHaveBeenCalledWith('short')
  })

  it('pills are keyboard accessible', async () => {
    const user = userEvent.setup()
    render(<PlanFilterBar {...DEFAULT_PROPS} />)
    const comfortPill = screen.getByText('Comfort')
    comfortPill.focus()
    await user.keyboard('{Enter}')
    expect(DEFAULT_PROPS.onThemeChange).toHaveBeenCalledWith('comfort')
  })
})
