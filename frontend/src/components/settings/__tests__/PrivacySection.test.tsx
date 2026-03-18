import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '@/components/ui/Toast'
import { PrivacySection } from '../PrivacySection'
import { DEFAULT_SETTINGS } from '@/services/settings-storage'
import { FRIENDS_KEY } from '@/services/friends-storage'
import type { FriendsData } from '@/types/dashboard'

const defaultPrivacy = { ...DEFAULT_SETTINGS.privacy }

function renderPrivacy(props: Partial<Parameters<typeof PrivacySection>[0]> = {}) {
  const onUpdatePrivacy = props.onUpdatePrivacy ?? vi.fn()
  const onUnblockUser = props.onUnblockUser ?? vi.fn()
  const result = render(
    <ToastProvider>
      <PrivacySection
        privacy={props.privacy ?? defaultPrivacy}
        onUpdatePrivacy={onUpdatePrivacy}
        onUnblockUser={onUnblockUser}
      />
    </ToastProvider>,
  )
  return { ...result, onUpdatePrivacy, onUnblockUser }
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

  // --- Blocked Users ---

  it('empty blocked users shows message', () => {
    renderPrivacy()
    expect(screen.getByText("You haven't blocked anyone")).toBeInTheDocument()
  })

  it('blocked users list renders', () => {
    renderPrivacy({
      privacy: { ...defaultPrivacy, blockedUsers: ['user-mock-1', 'user-mock-2'] },
    })
    const unblockButtons = screen.getAllByRole('button', { name: 'Unblock' })
    expect(unblockButtons).toHaveLength(2)
  })

  it('unblock removes from settings', async () => {
    const user = userEvent.setup()
    const { onUnblockUser } = renderPrivacy({
      privacy: { ...defaultPrivacy, blockedUsers: ['user-mock-1'] },
    })
    await user.click(screen.getByRole('button', { name: 'Unblock' }))
    expect(onUnblockUser).toHaveBeenCalledWith('user-mock-1')
  })

  it('unblock removes from wr_friends', async () => {
    const user = userEvent.setup()
    const friendsData: FriendsData = {
      friends: [],
      pendingIncoming: [],
      pendingOutgoing: [],
      blocked: ['user-mock-1'],
    }
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(friendsData))

    renderPrivacy({
      privacy: { ...defaultPrivacy, blockedUsers: ['user-mock-1'] },
    })
    await user.click(screen.getByRole('button', { name: 'Unblock' }))

    const updated = JSON.parse(localStorage.getItem(FRIENDS_KEY)!)
    expect(updated.blocked).toEqual([])
  })

  it('unblock shows toast', async () => {
    const user = userEvent.setup()
    renderPrivacy({
      privacy: { ...defaultPrivacy, blockedUsers: ['user-mock-1'] },
    })
    await user.click(screen.getByRole('button', { name: 'Unblock' }))
    // The toast message includes the display name (or "Unknown User" for mock IDs not in ALL_MOCK_USERS)
    expect(screen.getByText(/Unblocked/)).toBeInTheDocument()
  })
})
