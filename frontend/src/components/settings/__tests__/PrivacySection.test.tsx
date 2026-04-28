import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '@/components/ui/Toast'
import { PrivacySection } from '../PrivacySection'
import { DEFAULT_SETTINGS } from '@/services/settings-storage'

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
    expect(selected.className).toContain('bg-primary/20')
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
})
