import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DayContent } from '../DayContent'
import type { PlanDayContent } from '@/types/reading-plans'

const MOCK_DAY: PlanDayContent = {
  dayNumber: 1,
  title: 'Finding Peace',
  passage: {
    reference: 'Philippians 4:6-7',
    verses: [
      { number: 6, text: 'In nothing be anxious...' },
      { number: 7, text: 'And the peace of God...' },
    ],
  },
  reflection: ['Reflect on what peace means.'],
  prayer: 'Lord, grant me peace.',
  actionStep: 'Take a moment to breathe.',
}

function renderDayContent(day = MOCK_DAY) {
  return render(
    <MemoryRouter>
      <DayContent day={day} />
    </MemoryRouter>,
  )
}

describe('DayContent', () => {
  it('reading plan day reference is a link', () => {
    renderDayContent()
    const link = screen.getByRole('link', { name: 'Philippians 4:6-7' })
    expect(link).toHaveAttribute('href', '/bible/philippians/4#verse-6')
  })
})
