/**
 * Spec 6.6 — PrayerWallViewTabs tests.
 *
 * The tab strip is the cross-navigation primitive between the main Prayer
 * Wall feed and the Answered Wall. Coverage:
 *
 *   1. Both "All" and "Answered" links render
 *   2. The active route's link carries `aria-current="page"` (not aria-pressed
 *      — this is route navigation, NOT a toggle)
 *   3. Tab order reaches both links (keyboard a11y)
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PrayerWallViewTabs } from '../PrayerWallViewTabs'

function renderAt(path: string) {
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <PrayerWallViewTabs />
    </MemoryRouter>,
  )
}

describe('PrayerWallViewTabs', () => {
  it('renders both "All" and "Answered" navigation links', () => {
    renderAt('/prayer-wall')
    const nav = screen.getByRole('navigation', { name: 'Prayer Wall views' })
    expect(nav).toBeInTheDocument()
    const links = screen.getAllByRole('link')
    const allLink = links.find((l) => l.textContent === 'All')
    const answeredLink = links.find((l) => l.textContent === 'Answered')
    expect(allLink).toBeDefined()
    expect(answeredLink).toBeDefined()
    expect(allLink?.getAttribute('href')).toBe('/prayer-wall')
    expect(answeredLink?.getAttribute('href')).toBe('/prayer-wall/answered')
  })

  it('marks the Answered link with aria-current="page" when on /prayer-wall/answered', () => {
    renderAt('/prayer-wall/answered')
    const answeredLink = screen.getByRole('link', { name: 'Answered' })
    const allLink = screen.getByRole('link', { name: 'All' })
    expect(answeredLink).toHaveAttribute('aria-current', 'page')
    // The inactive tab MUST NOT carry aria-current (would imply both are
    // active and confuse screen readers).
    expect(allLink).not.toHaveAttribute('aria-current')
  })

  it('marks the All link with aria-current="page" when on /prayer-wall', () => {
    renderAt('/prayer-wall')
    const allLink = screen.getByRole('link', { name: 'All' })
    const answeredLink = screen.getByRole('link', { name: 'Answered' })
    expect(allLink).toHaveAttribute('aria-current', 'page')
    expect(answeredLink).not.toHaveAttribute('aria-current')
  })

  it('uses aria-current (not aria-pressed) — this is route navigation, not a toggle', () => {
    // WAI-ARIA: aria-pressed is for toggle buttons. The Visual Rollout's
    // tab-strip pattern uses Link + aria-current="page" so screen readers
    // announce "current page" instead of "pressed". This test guards the
    // semantic choice.
    renderAt('/prayer-wall/answered')
    const answeredLink = screen.getByRole('link', { name: 'Answered' })
    expect(answeredLink).not.toHaveAttribute('aria-pressed')
  })

  it('both tabs are keyboard-focusable (links are focusable by default)', () => {
    renderAt('/prayer-wall')
    const allLink = screen.getByRole('link', { name: 'All' })
    const answeredLink = screen.getByRole('link', { name: 'Answered' })
    // Anchor elements with href are in the tab order by default; assert
    // neither carries tabindex="-1" which would remove them.
    expect(allLink.getAttribute('tabindex')).not.toBe('-1')
    expect(answeredLink.getAttribute('tabindex')).not.toBe('-1')
  })
})
