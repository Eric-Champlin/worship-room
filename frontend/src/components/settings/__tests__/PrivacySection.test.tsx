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
const defaultPrayerWall = { ...DEFAULT_SETTINGS.prayerWall }

function renderPrivacy(props: Partial<Parameters<typeof PrivacySection>[0]> = {}) {
  const onUpdatePrivacy = props.onUpdatePrivacy ?? vi.fn()
  const onUpdatePrayerWall = props.onUpdatePrayerWall ?? vi.fn()
  const onUnblock = props.onUnblock ?? vi.fn()
  const result = render(
    <ToastProvider>
      <PrivacySection
        privacy={props.privacy ?? defaultPrivacy}
        prayerWall={props.prayerWall ?? defaultPrayerWall}
        friendsBlocked={props.friendsBlocked ?? []}
        onUpdatePrivacy={onUpdatePrivacy}
        onUpdatePrayerWall={onUpdatePrayerWall}
        onUnblock={onUnblock}
      />
    </ToastProvider>,
  )
  return { ...result, onUpdatePrivacy, onUpdatePrayerWall, onUnblock }
}

describe('PrivacySection', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // --- Toggles ---

  it('privacy toggles render with correct defaults', () => {
    renderPrivacy()
    const switches = screen.getAllByRole('switch')
    // Spec 6.1 added prayerReceiptsVisible — now 3 toggles, all default ON.
    expect(switches).toHaveLength(3)
    expect(switches[0]).toHaveAttribute('aria-checked', 'true') // showOnGlobalLeaderboard
    expect(switches[1]).toHaveAttribute('aria-checked', 'true') // activityStatus
    expect(switches[2]).toHaveAttribute('aria-checked', 'true') // prayerReceiptsVisible
  })

  // --- Spec 6.1 — Prayer Receipts toggle ---

  it('toggling the Prayer Receipts switch calls onUpdatePrayerWall', async () => {
    const user = userEvent.setup()
    const { onUpdatePrayerWall } = renderPrivacy()
    // 3rd switch is prayerReceiptsVisible (order: leaderboard, activityStatus, prayerReceipts).
    const switches = screen.getAllByRole('switch')
    expect(switches).toHaveLength(3)
    await user.click(switches[2])
    expect(onUpdatePrayerWall).toHaveBeenCalledWith({ prayerReceiptsVisible: false })
  })

  it('Prayer Receipts off-state shows NO shaming copy (Gate-35 / W25)', () => {
    renderPrivacy({ prayerWall: { prayerReceiptsVisible: false } })
    // Off-state description is the SAME canonical helper as the on-state
    // (Copy Deck verbatim — Gate-34). Anti-pressure check: the off-state
    // adds no shaming copy — no "you've hidden", no "you're missing X
    // prayers", no "people are still praying but you can't see them",
    // no exclamation points in the toggle row, no comparison framing.
    expect(screen.queryByText(/you've hidden/i)).toBeNull()
    expect(screen.queryByText(/you are missing/i)).toBeNull()
    expect(screen.queryByText(/you're missing/i)).toBeNull()
    expect(screen.queryByText(/still praying but/i)).toBeNull()
    expect(screen.queryByText(/people have prayed/i)).toBeNull()
    // The toggle renders, off.
    const prayerToggle = screen.getByLabelText(/Show me my prayer receipts/i)
    expect(prayerToggle).toHaveAttribute('aria-checked', 'false')
    // The canonical helper text from the master plan Copy Deck IS present —
    // it's informational, not shaming, and renders in both states.
    expect(
      screen.getByText(
        /Turn this off if you'd rather not see who's praying for you right now\. You can turn it back on anytime\./,
      ),
    ).toBeInTheDocument()
  })

  it('Prayer Receipts on-state shows the canonical Copy Deck helper text (Gate-34)', () => {
    renderPrivacy({ prayerWall: { prayerReceiptsVisible: true } })
    expect(
      screen.getByText(
        /Turn this off if you'd rather not see who's praying for you right now\. You can turn it back on anytime\./,
      ),
    ).toBeInTheDocument()
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
    // Spec 6.3 added a Night Mode radiogroup — now 3 groups
    // (nudge permission, streak visibility, night mode).
    expect(groups).toHaveLength(3)
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

  // --- Spec 6.3 — Night Mode preference UI ---

  it('Night Mode RadioPillGroup renders with 3 options', () => {
    renderPrivacy()
    const nightGroup = screen.getByRole('radiogroup', { name: 'Night Mode' })
    const radios = nightGroup.querySelectorAll('[role="radio"]')
    expect(radios).toHaveLength(3)
    expect(radios[0]).toHaveTextContent('Auto (9pm – 6am)')
    expect(radios[1]).toHaveTextContent('Always on')
    expect(radios[2]).toHaveTextContent('Always off')
  })

  it('Night Mode defaults to auto (matches DEFAULT_SETTINGS)', () => {
    renderPrivacy()
    const nightGroup = screen.getByRole('radiogroup', { name: 'Night Mode' })
    const selected = nightGroup.querySelector('[aria-checked="true"]')
    expect(selected).toHaveTextContent('Auto (9pm – 6am)')
  })

  it('selecting "Always on" calls onUpdatePrayerWall with nightMode="on"', async () => {
    const user = userEvent.setup()
    const { onUpdatePrayerWall } = renderPrivacy()
    const nightGroup = screen.getByRole('radiogroup', { name: 'Night Mode' })
    const onBtn = within(nightGroup).getByRole('radio', { name: 'Always on' })
    await user.click(onBtn)
    expect(onUpdatePrayerWall).toHaveBeenCalledWith({ nightMode: 'on' })
  })

  it('Prayer Wall sub-section has id="night-mode" anchor for chip popover deep link', () => {
    const { container } = renderPrivacy()
    const anchor = container.querySelector('#night-mode')
    expect(anchor).not.toBeNull()
    // Both the Prayer Receipts toggle and the Night Mode radiogroup live inside the same anchor
    expect(anchor!.querySelector('[role="radiogroup"][aria-label="Night Mode"]')).not.toBeNull()
    expect(within(anchor as HTMLElement).getByLabelText(/Show me my prayer receipts/i)).toBeInTheDocument()
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
