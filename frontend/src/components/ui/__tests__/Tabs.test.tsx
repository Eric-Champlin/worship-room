import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Tabs, type TabItem } from '../Tabs'

const ITEMS: TabItem[] = [
  { id: 'plans', label: 'Reading Plans' },
  { id: 'challenges', label: 'Challenges' },
]

function renderTabs(
  activeId: string = 'plans',
  overrides?: { items?: TabItem[]; onChange?: (id: string) => void; ariaLabel?: string },
) {
  const onChange = overrides?.onChange ?? vi.fn()
  const items = overrides?.items ?? ITEMS
  const utils = render(
    <Tabs
      items={items}
      activeId={activeId}
      onChange={onChange}
      ariaLabel={overrides?.ariaLabel ?? 'Test tabs'}
    />,
  )
  return { ...utils, onChange }
}

describe('Tabs', () => {
  it('renders tablist with role and aria-label', () => {
    renderTabs()
    const list = screen.getByRole('tablist')
    expect(list).toHaveAttribute('aria-label', 'Test tabs')
  })

  it('renders each item as role=tab with correct aria-selected', () => {
    renderTabs('plans')
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(2)
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false')
  })

  it('renders icon, label, and badge per item', () => {
    renderTabs('plans', {
      items: [
        {
          id: 'plans',
          label: 'Reading Plans',
          icon: <svg data-testid="icon" />,
          badge: <span data-testid="badge">●</span>,
        },
        { id: 'challenges', label: 'Challenges' },
      ],
    })
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByTestId('badge')).toBeInTheDocument()
  })

  it('clicking an inactive tab calls onChange with that id', () => {
    const { onChange } = renderTabs('plans')
    fireEvent.click(screen.getByRole('tab', { name: /Challenges/ }))
    expect(onChange).toHaveBeenCalledWith('challenges')
  })

  it('ArrowRight rotates focus and calls onChange', () => {
    const { onChange } = renderTabs('plans')
    const activeTab = screen.getByRole('tab', { name: /Reading Plans/ })
    fireEvent.keyDown(activeTab, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith('challenges')
  })

  it('ArrowRight wraps from last to first', () => {
    const { onChange } = renderTabs('challenges')
    const activeTab = screen.getByRole('tab', { name: /Challenges/ })
    fireEvent.keyDown(activeTab, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith('plans')
  })

  it('ArrowLeft wraps from first to last', () => {
    const { onChange } = renderTabs('plans')
    const activeTab = screen.getByRole('tab', { name: /Reading Plans/ })
    fireEvent.keyDown(activeTab, { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenCalledWith('challenges')
  })

  it('Home key jumps to first tab', () => {
    const { onChange } = renderTabs('challenges')
    const activeTab = screen.getByRole('tab', { name: /Challenges/ })
    fireEvent.keyDown(activeTab, { key: 'Home' })
    expect(onChange).toHaveBeenCalledWith('plans')
  })

  it('End key jumps to last tab', () => {
    const { onChange } = renderTabs('plans')
    const activeTab = screen.getByRole('tab', { name: /Reading Plans/ })
    fireEvent.keyDown(activeTab, { key: 'End' })
    expect(onChange).toHaveBeenCalledWith('challenges')
  })

  it('tabIndex is 0 on active tab and -1 on inactive', () => {
    renderTabs('plans')
    const tabs = screen.getAllByRole('tab')
    expect(tabs[0]).toHaveAttribute('tabindex', '0')
    expect(tabs[1]).toHaveAttribute('tabindex', '-1')
  })

  it('aria-controls on each tab matches tabpanel-<id>', () => {
    renderTabs('plans')
    const [plansTab, challengesTab] = screen.getAllByRole('tab')
    expect(plansTab).toHaveAttribute('aria-controls', 'tabpanel-plans')
    expect(challengesTab).toHaveAttribute('aria-controls', 'tabpanel-challenges')
  })

  it('non-arrow keys do not call onChange', () => {
    const { onChange } = renderTabs('plans')
    const activeTab = screen.getByRole('tab', { name: /Reading Plans/ })
    fireEvent.keyDown(activeTab, { key: 'a' })
    expect(onChange).not.toHaveBeenCalled()
  })
})
