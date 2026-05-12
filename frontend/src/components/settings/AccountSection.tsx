import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/hooks/useAuth'
import { DeleteAccountModal } from './DeleteAccountModal'
import { ChangePasswordModal } from './ChangePasswordModal'

interface AccountSectionProps {
  email: string
}

export function AccountSection({ email }: AccountSectionProps) {
  const { showToast } = useToast()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)

  function handleDeleteConfirm() {
    // Spec 10A widened sweep: covers Worship Room (wr_*), legacy Worship Room
    // (worship-room-*), Bible reactive stores (bible:*), and Bible AI/audio cache
    // (bb26-, bb29-, bb32-, bb44-). The 'bb' prefix is intentionally broad — every
    // current bb*-v1: key is documented in 11b-local-storage-keys-bible.md. If a
    // future feature introduces a 'bb' prefix that should NOT be deleted, this list
    // needs revisiting.
    const DELETE_PREFIXES = ['wr_', 'worship-room-', 'bible:', 'bb']

    const keysToDelete: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && DELETE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach((key) => localStorage.removeItem(key))

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
              className="text-sm text-violet-300 hover:text-violet-200 transition-colors min-h-[44px] px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
            >
              Change Email
            </button>
          </div>

          {/* Change Password */}
          <div>
            <button
              type="button"
              onClick={() => setShowChangePasswordModal(true)}
              className="text-sm text-violet-300 hover:text-violet-200 transition-colors min-h-[44px] px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
            >
              Change Password
            </button>
          </div>

          {/* Spec 1.5g — Active Sessions */}
          <div>
            <button
              type="button"
              onClick={() => navigate('/settings/sessions')}
              className="text-sm text-violet-300 hover:text-violet-200 transition-colors min-h-[44px] px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
            >
              Active sessions
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
            className="bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40 rounded-lg px-4 py-3 text-sm font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
          >
            Delete Account
          </button>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSuccess={() => {
          setShowChangePasswordModal(false)
          showToast('Your password has been updated.')
        }}
      />

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}
