import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { DashboardHero } from '../DashboardHero'

afterEach(() => {
  vi.useRealTimers()
})

function setHour(hour: number) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 2, 16, hour, 0, 0))
}

describe('DashboardHero', () => {
  it('shows morning greeting (hours 5-11)', () => {
    setHour(9)
    render(<DashboardHero userName="Eric" />)
    expect(screen.getByText(/Good morning/)).toBeInTheDocument()
    expect(screen.getByText('Eric')).toBeInTheDocument()
  })

  it('shows afternoon greeting (hours 12-16)', () => {
    setHour(14)
    render(<DashboardHero userName="Eric" />)
    expect(screen.getByText(/Good afternoon/)).toBeInTheDocument()
  })

  it('shows evening greeting (hours 17-4)', () => {
    setHour(20)
    render(<DashboardHero userName="Eric" />)
    expect(screen.getByText(/Good evening/)).toBeInTheDocument()
  })

  it('shows user name from props', () => {
    setHour(9)
    render(<DashboardHero userName="Sarah" />)
    expect(screen.getByText('Sarah')).toBeInTheDocument()
  })

  it('shows placeholder streak text', () => {
    render(<DashboardHero userName="Eric" />)
    expect(screen.getByText('Start your streak today')).toBeInTheDocument()
  })

  it('shows placeholder level text', () => {
    render(<DashboardHero userName="Eric" />)
    expect(screen.getByText('Seedling')).toBeInTheDocument()
    expect(screen.getByText('0 Faith Points')).toBeInTheDocument()
  })

  it('truncates long names', () => {
    render(<DashboardHero userName="Bartholomew Alexander Montgomery III" />)
    const nameSpan = screen.getByText('Bartholomew Alexander Montgomery III')
    expect(nameSpan).toHaveClass('truncate')
  })
})
