import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { DashboardCard } from '../DashboardCard'

beforeEach(() => {
  localStorage.clear()
})

function renderCard(props?: Partial<React.ComponentProps<typeof DashboardCard>>) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <DashboardCard id="test-card" title="Test Card" {...props}>
        <p>Card content</p>
      </DashboardCard>
    </MemoryRouter>,
  )
}

describe('DashboardCard', () => {
  it('renders title and children', () => {
    renderCard()
    expect(screen.getByText('Test Card')).toBeInTheDocument()
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('collapse toggle hides content', async () => {
    const user = userEvent.setup()
    renderCard()

    const toggle = screen.getByRole('button', { name: /collapse test card/i })
    const contentWrapper = toggle.getAttribute('aria-controls')
    const contentEl = document.getElementById(contentWrapper!)!

    // Initially expanded
    expect(contentEl).toHaveClass('grid-rows-[1fr]')

    await user.click(toggle)
    expect(contentEl).toHaveClass('grid-rows-[0fr]')

    await user.click(toggle)
    expect(contentEl).toHaveClass('grid-rows-[1fr]')
  })

  it('collapse state persists to localStorage', async () => {
    const user = userEvent.setup()
    renderCard({ id: 'my-widget' })

    const toggle = screen.getByRole('button', { name: /collapse/i })
    await user.click(toggle)

    const stored = JSON.parse(localStorage.getItem('wr_dashboard_collapsed') || '{}')
    expect(stored['my-widget']).toBe(true)
  })

  it('reads initial state from localStorage', () => {
    localStorage.setItem(
      'wr_dashboard_collapsed',
      JSON.stringify({ 'test-card': true }),
    )
    renderCard()

    const toggle = screen.getByRole('button', { name: /expand test card/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('aria-expanded toggles', async () => {
    const user = userEvent.setup()
    renderCard()

    const toggle = screen.getByRole('button', { name: /collapse test card/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('action link renders with correct href', () => {
    renderCard({ action: { label: 'See More', to: '/insights' } })
    const link = screen.getByRole('link', { name: 'See More' })
    expect(link).toHaveAttribute('href', '/insights')
  })

  it('uses section with aria-labelledby', () => {
    renderCard()
    const section = screen.getByRole('region')
    expect(section.tagName).toBe('SECTION')
    const labelledBy = section.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    const title = document.getElementById(labelledBy!)
    expect(title?.textContent).toBe('Test Card')
  })
})
