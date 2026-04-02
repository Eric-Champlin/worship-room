import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { FeatureShowcaseTabs } from '../FeatureShowcaseTabs'
import { FEATURE_TABS } from '@/constants/feature-showcase'

describe('FeatureShowcaseTabs', () => {
  const defaultProps = {
    tabs: FEATURE_TABS,
    activeTab: 'devotional',
    onTabChange: vi.fn(),
  }

  it('renders tablist with 5 tabs', () => {
    render(<FeatureShowcaseTabs {...defaultProps} />)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(5)
  })

  it('first tab has aria-selected="true"', () => {
    render(<FeatureShowcaseTabs {...defaultProps} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false')
  })

  it('clicking a tab calls onTabChange with correct ID', async () => {
    const user = userEvent.setup()
    const onTabChange = vi.fn()
    render(
      <FeatureShowcaseTabs {...defaultProps} onTabChange={onTabChange} />
    )
    const tabs = screen.getAllByRole('tab')
    await user.click(tabs[1])
    expect(onTabChange).toHaveBeenCalledWith('prayer')
  })

  it('ArrowRight moves to next tab', async () => {
    const user = userEvent.setup()
    const onTabChange = vi.fn()
    render(
      <FeatureShowcaseTabs {...defaultProps} onTabChange={onTabChange} />
    )
    const tabs = screen.getAllByRole('tab')
    tabs[0].focus()
    await user.keyboard('{ArrowRight}')
    expect(onTabChange).toHaveBeenCalledWith('prayer')
  })

  it('ArrowLeft wraps from first to last tab', async () => {
    const user = userEvent.setup()
    const onTabChange = vi.fn()
    render(
      <FeatureShowcaseTabs {...defaultProps} onTabChange={onTabChange} />
    )
    const tabs = screen.getAllByRole('tab')
    tabs[0].focus()
    await user.keyboard('{ArrowLeft}')
    expect(onTabChange).toHaveBeenCalledWith('growth')
  })

  it('active tab has tabIndex 0, inactive have tabIndex -1', () => {
    render(<FeatureShowcaseTabs {...defaultProps} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs[0]).toHaveAttribute('tabindex', '0')
    expect(tabs[1]).toHaveAttribute('tabindex', '-1')
    expect(tabs[2]).toHaveAttribute('tabindex', '-1')
  })

  it('tab labels have hidden sm:inline class', () => {
    render(<FeatureShowcaseTabs {...defaultProps} />)
    const labelSpans = screen.getAllByRole('tab').map(
      (tab) => tab.querySelector('span')
    )
    labelSpans.forEach((span) => {
      expect(span?.className).toContain('hidden')
      expect(span?.className).toContain('sm:inline')
    })
  })

  it('active tab has purple glow shadow class', () => {
    render(<FeatureShowcaseTabs {...defaultProps} />)
    const activeTab = screen.getAllByRole('tab')[0]
    expect(activeTab.className).toContain(
      'shadow-[0_0_20px_rgba(139,92,246,0.15)]'
    )
  })
})
