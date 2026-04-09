import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ActivePlanReaderBanner } from '../ActivePlanReaderBanner'

const DEFAULT_PROPS = {
  planTitle: 'Psalms of Comfort',
  currentDay: 5,
  isDayCompleted: false,
  onMarkComplete: vi.fn(),
  onDismiss: vi.fn(),
  chromeOpacity: 1,
  chromePointerEvents: 'auto' as const,
  chromeTransitionMs: 300,
}

function renderBanner(props = DEFAULT_PROPS) {
  return render(<ActivePlanReaderBanner {...props} />)
}

describe('ActivePlanReaderBanner', () => {
  it('renders when on current day passage', () => {
    renderBanner()
    expect(screen.getByText('Day 5 of Psalms of Comfort')).toBeInTheDocument()
    expect(screen.getByText("You're reading today's passage")).toBeInTheDocument()
  })

  it('shows "Mark day complete" when day not completed', () => {
    renderBanner()
    expect(screen.getByText('Mark day complete')).toBeInTheDocument()
  })

  it('hides "Mark day complete" when day already completed', () => {
    renderBanner({ ...DEFAULT_PROPS, isDayCompleted: true })
    expect(screen.queryByText('Mark day complete')).not.toBeInTheDocument()
  })

  it('mark complete calls onMarkComplete', () => {
    const fn = vi.fn()
    renderBanner({ ...DEFAULT_PROPS, onMarkComplete: fn })

    fireEvent.click(screen.getByText('Mark day complete'))
    expect(fn).toHaveBeenCalled()
  })

  it('dismiss hides banner', () => {
    const fn = vi.fn()
    renderBanner({ ...DEFAULT_PROPS, onDismiss: fn })

    fireEvent.click(screen.getByLabelText('Dismiss plan banner'))
    expect(fn).toHaveBeenCalled()
  })

  it('respects focus mode opacity', () => {
    const { container } = renderBanner({ ...DEFAULT_PROPS, chromeOpacity: 0, chromePointerEvents: 'none' })

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.opacity).toBe('0')
    expect(wrapper.style.pointerEvents).toBe('none')
  })
})
