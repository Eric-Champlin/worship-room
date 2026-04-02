import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FeatureShowcasePanel } from '../FeatureShowcasePanel'
import { FEATURE_TABS } from '@/constants/feature-showcase'

describe('FeatureShowcasePanel', () => {
  it('renders active tab panel content', () => {
    render(<FeatureShowcasePanel tabs={FEATURE_TABS} activeTab="devotional" />)
    expect(
      screen.getByText('Start Each Day with Purpose')
    ).toBeInTheDocument()
    expect(
      screen.getByText(/A fresh devotional every morning/)
    ).toBeInTheDocument()
  })

  it('active panel has opacity-100 class', () => {
    const { container } = render(
      <FeatureShowcasePanel tabs={FEATURE_TABS} activeTab="devotional" />
    )
    const activePanel = container.querySelector('#panel-devotional')
    expect(activePanel).toBeInTheDocument()
    expect(activePanel?.className).toContain('opacity-100')
  })

  it('inactive panels have aria-hidden="true"', () => {
    render(<FeatureShowcasePanel tabs={FEATURE_TABS} activeTab="devotional" />)
    const panels = screen.getAllByRole('tabpanel', { hidden: true })
    const inactivePanels = panels.filter(
      (p) => p.id !== 'panel-devotional'
    )
    inactivePanels.forEach((panel) => {
      expect(panel).toHaveAttribute('aria-hidden', 'true')
    })
  })

  it('renders correct preview component for active tab', () => {
    render(<FeatureShowcasePanel tabs={FEATURE_TABS} activeTab="devotional" />)
    expect(screen.getByText('April 2, 2026')).toBeInTheDocument()
  })

  it('switching activeTab changes visible content', () => {
    const { rerender } = render(
      <FeatureShowcasePanel tabs={FEATURE_TABS} activeTab="devotional" />
    )
    expect(
      screen.getByText('Start Each Day with Purpose')
    ).toBeInTheDocument()

    rerender(
      <FeatureShowcasePanel tabs={FEATURE_TABS} activeTab="prayer" />
    )
    const prayerPanel = screen
      .getAllByRole('tabpanel', { hidden: true })
      .find((p) => p.id === 'panel-prayer')
    expect(prayerPanel?.className).toContain('opacity-100')
  })
})
