import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { TodaysPlanCard } from '../TodaysPlanCard'
import type { ActivePlan } from '@/types/bible-landing'

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

const PLAN_A: ActivePlan = {
  planId: 'gospel-john',
  currentDay: 3,
  totalDays: 14,
  planName: 'Gospel of John',
  todayReading: 'John 3:1-21',
  startedAt: Date.now(),
}

const PLAN_B: ActivePlan = {
  planId: 'psalms-30',
  currentDay: 10,
  totalDays: 30,
  planName: 'Psalms Journey',
  todayReading: 'Psalms 42:1-11',
  startedAt: Date.now(),
}

const PLAN_C: ActivePlan = {
  planId: 'proverbs-31',
  currentDay: 5,
  totalDays: 31,
  planName: 'Proverbs Daily',
  todayReading: 'Proverbs 5:1-23',
  startedAt: Date.now(),
}

describe('TodaysPlanCard', () => {
  it('renders plan name and day progress', () => {
    renderWithRouter(<TodaysPlanCard plans={[PLAN_A]} />)
    expect(screen.getByText('Gospel of John')).toBeInTheDocument()
    expect(screen.getByText('Day 3 of 14')).toBeInTheDocument()
  })

  it('renders progress bar with correct ARIA', () => {
    renderWithRouter(<TodaysPlanCard plans={[PLAN_A]} />)
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar.getAttribute('aria-valuenow')).toBe('3')
    expect(progressbar.getAttribute('aria-valuemin')).toBe('1')
    expect(progressbar.getAttribute('aria-valuemax')).toBe('14')
  })

  it("renders today's reading reference", () => {
    renderWithRouter(<TodaysPlanCard plans={[PLAN_A]} />)
    expect(screen.getByText('John 3:1-21')).toBeInTheDocument()
  })

  it('links to plan detail route', () => {
    renderWithRouter(<TodaysPlanCard plans={[PLAN_A]} />)
    const link = screen.getByRole('link', { name: /Gospel of John/i })
    expect(link.getAttribute('href')).toBe('/bible/plans/gospel-john')
  })

  it('Bible-side URL pattern only', () => {
    renderWithRouter(<TodaysPlanCard plans={[PLAN_A]} />)
    const link = screen.getByRole('link', { name: /Gospel of John/i })
    const href = link.getAttribute('href') ?? ''
    expect(href).toContain('/bible/plans/')
    expect(href).not.toContain('/reading-plans/')
  })

  it('shows +N more chip when multiple plans', () => {
    renderWithRouter(<TodaysPlanCard plans={[PLAN_A, PLAN_B, PLAN_C]} />)
    expect(screen.getByText('+2 more')).toBeInTheDocument()
  })

  it('+N more chip links to /bible/plans', () => {
    renderWithRouter(<TodaysPlanCard plans={[PLAN_A, PLAN_B]} />)
    const chip = screen.getByText('+1 more')
    expect(chip.closest('a')?.getAttribute('href')).toBe('/bible/plans')
  })

  it('returns null when plans empty', () => {
    const { container } = renderWithRouter(<TodaysPlanCard plans={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('active plan card still renders when plans exist', () => {
    renderWithRouter(<TodaysPlanCard plans={[PLAN_A]} />)
    expect(screen.getByText('Gospel of John')).toBeInTheDocument()
  })

  it('links have focus-visible ring', () => {
    renderWithRouter(<TodaysPlanCard plans={[PLAN_A]} />)
    const link = screen.getByRole('link', { name: /Gospel of John/i })
    expect(link.className).toContain('focus-visible:ring-2')
  })
})
