import { useState, useCallback, useRef, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, MoreVertical, Sprout, Leaf, Flower2, TreePine, Trees, Landmark } from 'lucide-react'
import type { FriendProfile } from '@/types/dashboard'
import { Avatar } from '@/components/prayer-wall/Avatar'
import { EncourageButton } from '@/components/social/EncourageButton'
import { NudgeButton } from '@/components/social/NudgeButton'
import { FriendMenu } from './FriendMenu'
import { splitDisplayName, formatFriendActivity } from './utils'

const LEVEL_ICONS: Record<number, React.ElementType> = {
  1: Sprout,
  2: Leaf,
  3: Flower2,
  4: TreePine,
  5: Trees,
  6: Landmark,
}

interface FriendRowProps {
  friend: FriendProfile
  onRemove: (friendId: string) => void
  onMute: (userId: string) => void
  onBlock: (userId: string) => void
}

const FriendRowInner = function FriendRow({ friend, onRemove, onMute, onBlock }: FriendRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { first, last } = splitDisplayName(friend.displayName)
  const LevelIcon = LEVEL_ICONS[friend.level] || Sprout
  const activityText = formatFriendActivity(friend.lastActive)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)

  const handleRowClick = useCallback(() => {
    navigate(`/profile/${friend.id}`)
  }, [friend.id, navigate])

  const handleRowKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        navigate(`/profile/${friend.id}`)
      }
    },
    [friend.id, navigate],
  )

  const handleMenuToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen((prev) => !prev)
  }, [])

  const handleMenuClose = useCallback(() => {
    setMenuOpen(false)
    menuTriggerRef.current?.focus()
  }, [])

  const handleRemove = useCallback(() => {
    onRemove(friend.id)
  }, [friend.id, onRemove])

  const handleMute = useCallback(() => {
    onMute(friend.id)
  }, [friend.id, onMute])

  const handleBlock = useCallback(() => {
    onBlock(friend.id)
  }, [friend.id, onBlock])

  return (
    <div role="listitem" className="group relative">
      <div
        role="link"
        tabIndex={0}
        onClick={handleRowClick}
        onKeyDown={handleRowKeyDown}
        className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors hover:bg-white/5"
      >
        <Avatar
          firstName={first}
          lastName={last}
          avatarUrl={friend.avatar || null}
          size="md"
          userId={friend.id}
        />
        <div className="min-w-0 flex-1">
          {/* Line 1: name + level */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{friend.displayName}</span>
            <span className="flex items-center gap-1 text-sm text-white/50">
              <LevelIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {friend.levelName}
            </span>
          </div>
          {/* Line 2: streak + activity (always visible on mobile, inline on desktop) */}
          <div className="flex items-center gap-3 text-sm">
            {friend.currentStreak > 0 && (
              <span className="flex items-center gap-1 text-amber-400">
                <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                {friend.currentStreak}
              </span>
            )}
            <span className="text-white/60">{activityText}</span>
          </div>
          {/* Nudge — only for inactive friends */}
          <NudgeButton
            friendId={friend.id}
            friendName={friend.displayName}
            lastActive={friend.lastActive}
          />
        </div>
        {/* Encourage button */}
        <EncourageButton
          friendId={friend.id}
          friendName={friend.displayName}
        />
        {/* Three-dot menu trigger */}
        <div className="relative flex-shrink-0">
          <button
            ref={menuTriggerRef}
            onClick={handleMenuToggle}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Options for ${friend.displayName}`}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white/70"
          >
            <MoreVertical className="h-5 w-5" aria-hidden="true" />
          </button>
          {menuOpen && (
            <FriendMenu
              friendName={friend.displayName}
              onRemove={handleRemove}
              onMute={handleMute}
              onBlock={handleBlock}
              onClose={handleMenuClose}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export const FriendRow = memo(FriendRowInner)
