import { useState, useCallback } from 'react'
import { Heart } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useSocialInteractions } from '@/hooks/useSocialInteractions'
import { NUDGE_INACTIVE_THRESHOLD_DAYS } from '@/constants/dashboard/encouragements'
import { NudgeDialog } from './NudgeDialog'

interface NudgeButtonProps {
  friendId: string
  friendName: string
  lastActive: string
}

function isInactive(lastActive: string): boolean {
  const msInactive = Date.now() - new Date(lastActive).getTime()
  return msInactive >= NUDGE_INACTIVE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000
}

function getNudgePermission(): boolean {
  try {
    const raw = localStorage.getItem('wr_settings')
    if (!raw) return true
    const settings = JSON.parse(raw)
    if (settings.nudgePermission === 'nobody') return false
    return true
  } catch {
    return true
  }
}

export function NudgeButton({ friendId, friendName, lastActive }: NudgeButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [nudgeSent, setNudgeSent] = useState(false)
  const { showToast } = useToast()
  const { sendNudge, canNudge, wasNudged } = useSocialInteractions()

  const canSend = canNudge(friendId) && !nudgeSent
  const alreadyNudged = wasNudged(friendId)

  const handleOpenDialog = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!canSend) return
      setDialogOpen(true)
    },
    [canSend],
  )

  const handleConfirm = useCallback(() => {
    setDialogOpen(false)
    sendNudge(friendId, friendName)
    showToast(`Nudge sent to ${friendName}`, 'success')
    setNudgeSent(true)
  }, [friendId, friendName, sendNudge, showToast])

  const handleCancel = useCallback(() => {
    setDialogOpen(false)
  }, [])

  // Don't render if friend is active or privacy disallows
  if (!isInactive(lastActive)) return null
  if (!getNudgePermission()) return null

  if (alreadyNudged || nudgeSent) {
    return (
      <span className="flex items-center gap-1 text-sm text-white/30" onClick={(e) => e.stopPropagation()}>
        <Heart className="h-3.5 w-3.5" aria-hidden="true" />
        Nudge sent
      </span>
    )
  }

  return (
    <span onClick={(e) => e.stopPropagation()}>
      <button
        onClick={handleOpenDialog}
        className="flex min-h-[44px] items-center gap-1 text-sm text-white/40 transition-colors hover:text-white/60"
        aria-label={`Send a nudge to ${friendName}`}
      >
        <Heart className="h-3.5 w-3.5" aria-hidden="true" />
        Send a nudge
      </button>
      {dialogOpen && (
        <NudgeDialog
          friendName={friendName}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </span>
  )
}
