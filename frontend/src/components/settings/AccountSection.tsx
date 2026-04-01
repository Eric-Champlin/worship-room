import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/hooks/useAuth'
import { DeleteAccountModal } from './DeleteAccountModal'

interface AccountSectionProps {
  email: string
}

export function AccountSection({ email }: AccountSectionProps) {
  const { showToast } = useToast()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  function handleDeleteConfirm() {
    // Remove all wr_ prefixed keys
    const keysToRemove = Object.keys(localStorage).filter((k) => k.startsWith('wr_'))
    keysToRemove.forEach((key) => localStorage.removeItem(key))

    // Remove legacy keys from before the wr_ prefix rename
    const legacyKeys = [
      'worship-room-daily-completion',
      'worship-room-journal-draft',
      'worship-room-journal-mode',
    ]
    legacyKeys.forEach((key) => localStorage.removeItem(key))

    // Remove any worship-room-bookmarks-* and other worship-room- prefixed keys
    Object.keys(localStorage)
      .filter((k) => k.startsWith('worship-room-'))
      .forEach((key) => localStorage.removeItem(key))

    logout()
    navigate('/')
  }

  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6">
        <h2 className="text-base font-semibold text-white md:text-lg mb-6">Account</h2>

        <div className="space-y-4">
          {/* Email */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Email</p>
              <p className="text-white">{email}</p>
            </div>
            <button
              type="button"
              onClick={() => showToast('This feature is on the way.')}
              className="text-sm text-primary hover:text-primary-lt transition-colors min-h-[44px] px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
            >
              Change Email
            </button>
          </div>

          {/* Change Password */}
          <div>
            <button
              type="button"
              onClick={() => showToast('This feature is on the way.')}
              className="text-sm text-primary hover:text-primary-lt transition-colors min-h-[44px] px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
            >
              Change Password
            </button>
          </div>
        </div>

        {/* Delete Account */}
        <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4">
          <p className="text-sm text-red-400 mb-4">
            Permanently delete your account and all data.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 rounded-lg px-4 py-3 text-sm font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
          >
            Delete Account
          </button>
        </div>
      </div>

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}
