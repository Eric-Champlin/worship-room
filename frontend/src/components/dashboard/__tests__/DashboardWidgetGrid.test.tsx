import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { DashboardWidgetGrid } from '../DashboardWidgetGrid'

beforeEach(() => {
  localStorage.clear()
})

function renderGrid() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <DashboardWidgetGrid />
    </MemoryRouter>,
  )
}

describe('DashboardWidgetGrid', () => {
  it('renders all 5 widget cards', () => {
    renderGrid()
    const sections = screen.getAllByRole('region')
    expect(sections.length).toBe(5)
  })

  it('placeholder text shows spec references', () => {
    renderGrid()
    expect(screen.getByText('Coming in Spec 3')).toBeInTheDocument()
    expect(screen.getAllByText('Coming in Spec 6')).toHaveLength(2)
    expect(screen.getByText('Coming in Spec 9')).toBeInTheDocument()
  })

  it('collapse persists across unmount/remount', async () => {
    const user = userEvent.setup()
    const { unmount } = renderGrid()

    // Collapse the first card (mood chart)
    const collapseButtons = screen.getAllByRole('button', { name: /collapse/i })
    await user.click(collapseButtons[0])

    unmount()
    renderGrid()

    // First card's collapse button should show "Expand" now
    const expandButtons = screen.getAllByRole('button', { name: /expand/i })
    expect(expandButtons.length).toBeGreaterThanOrEqual(1)
  })
})
