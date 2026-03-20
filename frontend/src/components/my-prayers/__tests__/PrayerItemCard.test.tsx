import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { PrayerItemCard } from '../PrayerItemCard'
import type { PersonalPrayer } from '@/types/personal-prayer'

function makePrayer(overrides: Partial<PersonalPrayer> = {}): PersonalPrayer {
  return {
    id: 'test-1',
    title: 'Healing for Mom',
    description: 'Please pray for my mother who is going through treatment.',
    category: 'health',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    answeredAt: null,
    answeredNote: null,
    lastPrayedAt: null,
    ...overrides,
  }
}

function renderCard(prayer: PersonalPrayer, props: { glowing?: boolean; children?: React.ReactNode } = {}) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <PrayerItemCard prayer={prayer} glowing={props.glowing}>
        {props.children}
      </PrayerItemCard>
    </MemoryRouter>,
  )
}

describe('PrayerItemCard', () => {
  it('renders prayer title and category badge', () => {
    renderCard(makePrayer())
    expect(screen.getByText('Healing for Mom')).toBeInTheDocument()
    expect(screen.getByText('Health')).toBeInTheDocument()
  })

  it('truncates long description with "Show more" button', () => {
    const longDesc = 'A'.repeat(200)
    renderCard(makePrayer({ description: longDesc }))
    expect(screen.getByText(/^A{150}\.\.\./)).toBeInTheDocument()
    expect(screen.getByText('Show more')).toBeInTheDocument()
  })

  it('"Show more" expands full description', async () => {
    const user = userEvent.setup()
    const longDesc = 'A'.repeat(151) + 'END'
    renderCard(makePrayer({ description: longDesc }))

    await user.click(screen.getByText('Show more'))
    expect(screen.getByText(longDesc)).toBeInTheDocument()
    expect(screen.getByText('Show less')).toBeInTheDocument()
  })

  it('shows "Prayed" indicator when lastPrayedAt is set', () => {
    renderCard(makePrayer({ lastPrayedAt: new Date().toISOString() }))
    expect(screen.getByText(/^Prayed /)).toBeInTheDocument()
  })

  it('does not show "Prayed" indicator when lastPrayedAt is null', () => {
    renderCard(makePrayer({ lastPrayedAt: null }))
    expect(screen.queryByText(/^Prayed /)).not.toBeInTheDocument()
  })

  it('shows answered badge with date for answered prayers', () => {
    renderCard(
      makePrayer({
        status: 'answered',
        answeredAt: '2026-03-18T12:00:00.000Z',
      }),
    )
    expect(screen.getByText('Answered')).toBeInTheDocument()
  })

  it('shows testimony note in italic when present', () => {
    renderCard(
      makePrayer({
        status: 'answered',
        answeredAt: '2026-03-18T12:00:00.000Z',
        answeredNote: 'God provided healing through treatment.',
      }),
    )
    const testimony = screen.getByText('God provided healing through treatment.')
    expect(testimony).toBeInTheDocument()
    expect(testimony.className).toContain('italic')
    expect(testimony.className).toContain('font-serif')
  })

  it('applies green left border for answered prayers', () => {
    const { container } = renderCard(
      makePrayer({
        status: 'answered',
        answeredAt: '2026-03-18T12:00:00.000Z',
      }),
    )
    const article = container.querySelector('article')!
    expect(article.className).toContain('border-l-success')
    expect(article.className).toContain('border-l-4')
  })

  it('applies glow effect when glowing prop is true', () => {
    const { container } = renderCard(makePrayer(), { glowing: true })
    const article = container.querySelector('article')!
    expect(article.className).toContain('ring-primary/30')
    expect(article.className).toContain('bg-primary/5')
  })

  it('renders children (action buttons)', () => {
    renderCard(makePrayer(), {
      children: <button type="button">Test Action</button>,
    })
    expect(screen.getByText('Test Action')).toBeInTheDocument()
  })
})
