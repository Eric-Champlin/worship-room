import { useState, useEffect, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'
import { useAudioState } from '@/components/audio/AudioProvider'
import { Z } from '@/constants/z-index'

const AUTO_DISMISS_MS = 30_000

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  const [dismissed, setDismissed] = useState(false)
  const updateButtonRef = useRef<HTMLButtonElement>(null)
  const hasFocusedRef = useRef(false)
  const { pillVisible } = useAudioState()

  useEffect(() => {
    if (needRefresh && !dismissed && !hasFocusedRef.current) {
      updateButtonRef.current?.focus()
      hasFocusedRef.current = true
    }
  }, [needRefresh, dismissed])

  useEffect(() => {
    if (!needRefresh || dismissed) return
    const timer = setTimeout(() => setDismissed(true), AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [needRefresh, dismissed])

  if (!needRefresh || dismissed) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-1/2 z-[${Z.UPDATE_PROMPT}] -translate-x-1/2 w-[calc(100%-32px)] sm:w-auto sm:max-w-[480px] bg-[rgba(15,10,30,0.85)] backdrop-blur-lg border border-primary/40 rounded-xl shadow-2xl p-4 flex items-center gap-3 motion-safe:animate-fade-in ${
        pillVisible ? 'bottom-24' : 'bottom-6'
      }`}
    >
      <RefreshCw className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <p className="text-sm text-white">
        A new version of Worship Room is available
      </p>
      <div className="flex shrink-0 items-center gap-1">
        <button
          ref={updateButtonRef}
          onClick={() => updateServiceWorker(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Update now
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="ml-2 text-white/60 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="Dismiss update notification"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
