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
              onClick={() => showToast('Email change coming soon')}
              className="text-sm text-primary hover:text-primary-lt transition-colors min-h-[44px] px-2"
            >
              Change Email
            </button>
          </div>

          {/* Change Password */}
          <div>
            <button
              type="button"
              onClick={() => showToast('Password change coming soon')}
              className="text-sm text-primary hover:text-primary-lt transition-colors min-h-[44px] px-2"
            >
              Change Password
            </button>
          </div>
        </div>

        {/* Delete Account */}
        <div className="border-t border-white/10 mt-6 pt-6">
          <p className="text-sm text-white/40 mb-4">
            Permanently delete your account and all data.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 rounded-lg px-4 py-3 text-sm font-medium transition-colors min-h-[44px]"
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
