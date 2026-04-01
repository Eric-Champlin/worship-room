import { useEffect, useRef, useState } from 'react'
import { Copy, Mail } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
  }
  // Fallback for non-HTTPS environments
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      resolve()
    } catch (err) {
      reject(err)
    } finally {
      document.body.removeChild(textarea)
    }
  })
}

function InviteByLink() {
  const codeRef = useRef(Math.random().toString(36).substring(2, 10))
  const { showToast } = useToast()
  const origin = import.meta.env.VITE_APP_URL || window.location.origin
  const url = `${origin}/invite/${codeRef.current}`

  async function handleCopy() {
    try {
      await copyToClipboard(url)
      showToast('Link copied — share it with a friend.', 'success')
    } catch (_e) {
      showToast("We couldn't copy that link. Try again.", 'error')
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
      <div className="mb-3 flex items-center gap-2">
        <Copy className="h-5 w-5 text-white/60" aria-hidden="true" />
        <h3 className="font-medium text-white">Invite by Link</h3>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          readOnly
          value={url}
          className="min-w-0 flex-1 truncate rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70"
          aria-label="Invite link"
        />
        <button
          onClick={handleCopy}
          className="flex-shrink-0 rounded-lg bg-primary px-4 py-2 min-h-[44px] text-sm font-medium text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
        >
          Copy Link
        </button>
      </div>
    </div>
  )
}

function InviteByEmail() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const sendTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const { showToast } = useToast()

  useEffect(() => {
    return () => { if (sendTimerRef.current) clearTimeout(sendTimerRef.current) }
  }, [])

  const isValidEmail = email.includes('@') && email.includes('.')

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!isValidEmail || sending) return
    setSending(true)
    sendTimerRef.current = setTimeout(() => {
      showToast('Invitation sent.', 'success')
      setEmail('')
      setSending(false)
    }, 300)
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
      <div className="mb-3 flex items-center gap-2">
        <Mail className="h-5 w-5 text-white/60" aria-hidden="true" />
        <h3 className="font-medium text-white">Invite by Email</h3>
      </div>
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="friend@email.com"
          aria-label="Friend's email address"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
        />
        <button
          type="submit"
          disabled={!isValidEmail || sending}
          className="flex-shrink-0 rounded-lg bg-primary px-4 py-2 min-h-[44px] text-sm font-medium text-white transition-colors hover:bg-primary-lt disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Send Invite'}
        </button>
      </form>
    </div>
  )
}

export function InviteSection() {
  return (
    <div id="invite-section" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <InviteByLink />
      <InviteByEmail />
    </div>
  )
}
