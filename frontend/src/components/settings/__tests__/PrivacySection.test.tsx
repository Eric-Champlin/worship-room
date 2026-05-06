import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '@/components/ui/Toast'
import { PrivacySection } from '../PrivacySection'
import { DEFAULT_SETTINGS } from '@/services/settings-storage'
import { MUTES_KEY } from '@/services/mutes-storage'

// PrivacySection now consumes useMutes (Spec 2.5.7), which calls useAuth internally.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { name: 'Test', id: 'test-user' },
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

const defaultPrivacy = { ...DEFAULT_SETTINGS.privacy }

function renderPrivacy(props: Partial<Parameters<typeof PrivacySection>[0]> = {}) {
  const onUpdatePrivacy = props.onUpdatePrivacy ?? vi.fn()
  const onUnblock = props.onUnblock ?? vi.fn()
  const result = render(
    <ToastProvider>
      <PrivacySection
        privacy={props.privacy ?? defaultPrivacy}
        friendsBlocked={props.friendsBlocked ?? []}
        onUpdatePrivacy={onUpdatePrivacy}
        onUnblock={onUnblock}
      />
    </ToastProvider>,
  )
  return { ...result, onUpdatePrivacy, onUnblock }
}

describe('PrivacySection', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // --- Toggles ---

  it('both privacy toggles render with correct defaults', () => {
    renderPrivacy()
    const switches = screen.getAllByRole('switch')
    expect(switches).toHaveLength(2)
    expect(switches[0]).toHaveAttribute('aria-checked', 'true') // showOnGlobalLeaderboard
    expect(switches[1]).toHaveAttribute('aria-checked', 'true') // activityStatus
  })

  it('toggling persists to settings', async () => {
    const user = userEvent.setup()
    const { onUpdatePrivacy } = renderPrivacy()
    const leaderboardToggle = screen.getAllByRole('switch')[0]
    await user.click(leaderboardToggle)
    expect(onUpdatePrivacy).toHaveBeenCalledWith({ showOnGlobalLeaderboard: false })
  })

  // --- Nudge Radio Group ---

  it('nudge radio group renders with 3 options', () => {
    renderPrivacy()
    const nudgeGroup = screen.getByRole('radiogroup', { name: 'Who can send nudges' })
    const radios = nudgeGroup.querySelectorAll('[role="radio"]')
    expect(radios).toHaveLength(3)
    expect(radios[0]).toHaveTextContent('Everyone')
    expect(radios[1]).toHaveTextContent('Friends')
    expect(radios[2]).toHaveTextContent('Nobody')
  })

  it('nudge radio defaults to Friends', () => {
    renderPrivacy()
    const nudgeGroup = screen.getByRole('radiogroup', { name: 'Who can send nudges' })
    const friendsBtn = nudgeGroup.querySelector('[aria-checked="true"]')
    expect(friendsBtn).toHaveTextContent('Friends')
  })

  it('selecting radio option calls onUpdatePrivacy', async () => {
    const user = userEvent.setup()
    const { onUpdatePrivacy } = renderPrivacy()
    const nudgeGroup = screen.getByRole('radiogroup', { name: 'Who can send nudges' })
    const nobodyBtn = nudgeGroup.querySelector('button:last-child')!
    await user.click(nobodyBtn)
    expect(onUpdatePrivacy).toHaveBeenCalledWith({ nudgePermission: 'nobody' })
  })

  // --- Streak Visibility Radio ---

  it('streak visibility radio renders', () => {
    renderPrivacy()
    const streakGroup = screen.getByRole('radiogroup', { name: /streak/i })
    const radios = streakGroup.querySelectorAll('[role="radio"]')
    expect(radios).toHaveLength(3)
    expect(screen.getByText('Only me')).toBeInTheDocument()
  })

  // --- ARIA ---

  it('role="radiogroup" with role="radio" on options', () => {
    renderPrivacy()
    const groups = screen.getAllByRole('radiogroup')
    expect(groups).toHaveLength(2)
    groups.forEach((group) => {
      const radios = group.querySelectorAll('[role="radio"]')
      expect(radios.length).toBeGreaterThan(0)
    })
  })

  it('arrow keys navigate radio options', async () => {
    const user = userEvent.setup()
    const { onUpdatePrivacy } = renderPrivacy()
    const nudgeGroup = screen.getByRole('radiogroup', { name: 'Who can send nudges' })
    const friendsBtn = nudgeGroup.querySelector('[aria-checked="true"]') as HTMLElement
    friendsBtn.focus()
    await user.keyboard('{ArrowRight}')
    expect(onUpdatePrivacy).toHaveBeenCalledWith({ nudgePermission: 'nobody' })
  })

  // --- Radio pill styling ---

  it('radio pills have selected/unselected styling', () => {
    renderPrivacy()
    const nudgeGroup = screen.getByRole('radiogroup', { name: 'Who can send nudges' })
    const selected = nudgeGroup.querySelector('[aria-checked="true"]') as HTMLElement
    const unselected = nudgeGroup.querySelector('[aria-checked="false"]') as HTMLElement
    expect(selected.className).toContain('bg-white/15')
    expect(unselected.className).toContain('bg-white/5')
  })

  // --- Blocked Users (Spec 2.5.6) ---

  it('empty blocked users shows message when both lists are empty', () => {
    renderPrivacy()
    expect(screen.getByText("You haven't blocked anyone")).toBeInTheDocument()
  })

  it('blocked list renders from friendsBlocked (canonical source)', () => {
    renderPrivacy({ friendsBlocked: ['user-mock-1', 'user-mock-2'] })
    const unblockButtons = screen.getAllByRole('button', { name: 'Unblock' })
    expect(unblockButtons).toHaveLength(2)
  })

  it('merges friendsBlocked with legacy privacy.blockedUsers and dedupes by id', () => {
    renderPrivacy({
      friendsBlocked: ['user-mock-1'],
      privacy: { ...defaultPrivacy, blockedUsers: ['user-mock-1', 'user-mock-2'] },
    })
    // user-mock-1 should appear ONCE despite being in both lists
    const unblockButtons = screen.getAllByRole('button', { name: 'Unblock' })
    expect(unblockButtons).toHaveLength(2)
  })

  it('clicking Unblock opens ConfirmDialog with unblock copy', async () => {
    const user = userEvent.setup()
    renderPrivacy({ friendsBlocked: ['user-mock-1'] })
    await user.click(screen.getByRole('button', { name: 'Unblock' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(
      screen.getByText(/You won't automatically become friends/),
    ).toBeInTheDocument()
  })

  it('confirming dialog calls onUnblock', async () => {
    const user = userEvent.setup()
    const { onUnblock } = renderPrivacy({ friendsBlocked: ['user-mock-1'] })
    await user.click(screen.getByRole('button', { name: 'Unblock' }))
    const dialog = screen.getByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Unblock' }))
    expect(onUnblock).toHaveBeenCalledWith('user-mock-1')
  })

  it('canceling dialog does not call onUnblock', async () => {
    const user = userEvent.setup()
    const { onUnblock } = renderPrivacy({ friendsBlocked: ['user-mock-1'] })
    await user.click(screen.getByRole('button', { name: 'Unblock' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onUnblock).not.toHaveBeenCalled()
  })

  it('shows toast after confirmed unblock', async () => {
    const user = userEvent.setup()
    renderPrivacy({ friendsBlocked: ['user-mock-1'] })
    await user.click(screen.getByRole('button', { name: 'Unblock' }))
    const dialog = screen.getByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Unblock' }))
    expect(await screen.findByText(/has been unblocked/)).toBeInTheDocument()
  })

  it('Unblock button uses text-violet-300', () => {
    renderPrivacy({ friendsBlocked: ['user-mock-1'] })
    const btn = screen.getByRole('button', { name: 'Unblock' })
    expect(btn.className).toContain('text-violet-300')
  })

  // --- Muted Users (Spec 2.5.7) ---

  it('Muted Users section renders empty state when wr_mutes.muted is empty', () => {
    renderPrivacy()
    expect(screen.getByText("You haven't muted anyone.")).toBeInTheDocument()
  })

  it('Muted Users section renders entries from wr_mutes with display names from ALL_MOCK_USERS', () => {
    localStorage.setItem(MUTES_KEY, JSON.stringify({ muted: ['user-emma-c'] }))
    renderPrivacy()
    // The display name 'Emma C.' (from ALL_MOCK_USERS) should be visible
    expect(screen.getByText('Emma C.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unmute' })).toBeInTheDocument()
  })

  it('Unmute click opens ConfirmDialog with title "Unmute {name}?" and the verse-reappears body', async () => {
    const user = userEvent.setup()
    localStorage.setItem(MUTES_KEY, JSON.stringify({ muted: ['user-emma-c'] }))
    renderPrivacy()
    await user.click(screen.getByRole('button', { name: 'Unmute' }))
    expect(screen.getByRole('alertdialog', { name: 'Unmute Emma C.?' })).toBeInTheDocument()
    expect(
      screen.getByText('Their posts will appear in your feed again.'),
    ).toBeInTheDocument()
  })

  it('Unmute button uses text-violet-300', () => {
    localStorage.setItem(MUTES_KEY, JSON.stringify({ muted: ['user-emma-c'] }))
    renderPrivacy()
    const btn = screen.getByRole('button', { name: 'Unmute' })
    expect(btn.className).toContain('text-violet-300')
  })

  it('Confirming Unmute removes the entry; canceling does not', async () => {
    const user = userEvent.setup()
    localStorage.setItem(MUTES_KEY, JSON.stringify({ muted: ['user-emma-c'] }))
    renderPrivacy()

    // Cancel path first — the entry must remain
    await user.click(screen.getByRole('button', { name: 'Unmute' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('Emma C.')).toBeInTheDocument()

    // Confirm path — the entry vanishes from the rendered list, toast fires
    await user.click(screen.getByRole('button', { name: 'Unmute' }))
    const dialog = screen.getByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Unmute' }))
    expect(await screen.findByText(/has been unmuted/)).toBeInTheDocument()
    expect(screen.queryByText('Emma C.')).not.toBeInTheDocument()
  })
})
