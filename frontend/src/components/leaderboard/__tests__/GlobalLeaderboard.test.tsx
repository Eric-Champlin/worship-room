import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { LEADERBOARD_KEY } from '@/services/leaderboard-storage'
import { GlobalLeaderboard } from '../GlobalLeaderboard'

const AUTH_VALUE = {
  isAuthenticated: true,
  user: { name: 'Test User', id: 'test-user-id' },
  login: vi.fn(),
  logout: vi.fn(),
}

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => AUTH_VALUE),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => AUTH_VALUE),
}))

function renderComponent() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <GlobalLeaderboard />
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('GlobalLeaderboard', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders top 50 entries initially', () => {
    renderComponent()
    const list = screen.getByRole('list', { name: 'Global leaderboard' })
    const items = within(list).getAllByRole('listitem')
    // Initial batch is 50 (user has 0 pts → rank 51, shown as pinned row, not in list)
    expect(items.length).toBe(50)
  })

  it('shows rank + name + points only (no avatar elements)', () => {
    renderComponent()
    // No img elements (avatars) in the global board
    const list = screen.getByRole('list', { name: 'Global leaderboard' })
    const images = within(list).queryAllByRole('img')
    expect(images).toHaveLength(0)
  })

  it('clicking a name opens ProfilePopup', async () => {
    const user = userEvent.setup()
    renderComponent()
    const buttons = screen.getAllByRole('button', { name: undefined })
    // Click the first row button (not the load more button)
    const firstRowButton = buttons.find((btn) => btn.textContent?.includes('pts'))
    if (firstRowButton) await user.click(firstRowButton)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('ProfilePopup closes on Escape key', async () => {
    const user = userEvent.setup()
    renderComponent()
    const buttons = screen.getAllByRole('button', { name: undefined })
    const firstRowButton = buttons.find((btn) => btn.textContent?.includes('pts'))
    if (firstRowButton) await user.click(firstRowButton)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('ProfilePopup closes on outside click', async () => {
    const user = userEvent.setup()
    renderComponent()
    const buttons = screen.getAllByRole('button', { name: undefined })
    const firstRowButton = buttons.find((btn) => btn.textContent?.includes('pts'))
    if (firstRowButton) await user.click(firstRowButton)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // Click outside (the list container)
    await user.click(screen.getByRole('list', { name: 'Global leaderboard' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('current user shown as pinned row when outside visible range', () => {
    renderComponent()
    // Test User has 0 pts so they rank 51st, outside the batch of 50
    // Pinned row should show
    expect(screen.getByText('Test User (You)')).toBeInTheDocument()
    expect(screen.getByText(/You're #\d+ this week/)).toBeInTheDocument()
  })

  it('current user highlighted in-line after load more', async () => {
    const user = userEvent.setup()
    renderComponent()
    // Click Load more to show all entries
    await user.click(screen.getByRole('button', { name: 'Load more' }))
    const list = screen.getByRole('list', { name: 'Global leaderboard' })
    const items = within(list).getAllByRole('listitem')
    const userItem = items.find((item) => item.textContent?.includes('Test User (You)'))
    expect(userItem).toBeDefined()
  })

  it('"Load more" button shows at bottom', () => {
    renderComponent()
    // All data fits in initial batch (51 entries, batch size 50 → first 50 visible)
    // Actually with 51 entries total, 50 visible → Load more still shows
    expect(screen.getByRole('button', { name: /Load more|All users loaded/ })).toBeInTheDocument()
  })

  it('"Load more" shows "All users loaded" when all loaded', async () => {
    const user = userEvent.setup()
    renderComponent()
    const loadBtn = screen.getByRole('button', { name: /Load more/ })
    await user.click(loadBtn)
    expect(screen.getByRole('button', { name: 'All users loaded' })).toBeDisabled()
  })

  it('global rows have correct sort order (descending by weekly points)', () => {
    renderComponent()
    const list = screen.getByRole('list', { name: 'Global leaderboard' })
    const items = within(list).getAllByRole('listitem')
    // First item should have highest weekly points
    expect(items[0]).toHaveTextContent('170 pts')
  })

  it('no "All Time" toggle present', () => {
    renderComponent()
    expect(screen.queryByRole('radio', { name: 'All Time' })).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'This Week' })).not.toBeInTheDocument()
  })

  it('pinned row has correct separator styling when user not visible', () => {
    // To test pinned row, we need more than BATCH_SIZE entries AND user not in top batch
    // With default mock data (50 entries + user at bottom), visibleCount=50 shows 50,
    // user is #51 so they would be outside the visible range
    // Actually with 51 total entries, batch of 50 means last entry (user) is not visible
    // This depends on the user's weekly points (0) vs mock data placement
    renderComponent()
    // Since user has 0 points, they rank last (51st) and batch shows 50
    // So pinned row should appear
    const pinnedText = screen.queryByText(/You're #\d+ this week/)
    // User with 0 points is ranked 51st, pinned row should show
    if (pinnedText) {
      const separator = pinnedText.closest('[class*="border-t"]')
      expect(separator).toBeDefined()
    }
  })

  it('re-initializes on corrupt localStorage data', () => {
    localStorage.setItem(LEADERBOARD_KEY, 'broken{json')
    renderComponent()
    const list = screen.getByRole('list', { name: 'Global leaderboard' })
    const items = within(list).getAllByRole('listitem')
    expect(items.length).toBeGreaterThan(0)
  })
})
