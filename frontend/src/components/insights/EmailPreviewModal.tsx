import { X } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface EmailPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  monthName: string
}

export function EmailPreviewModal({ isOpen, onClose, monthName }: EmailPreviewModalProps) {
  const containerRef = useFocusTrap(isOpen, onClose)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div ref={containerRef} onClick={(e) => e.stopPropagation()}>
        {/* Subject line — on the dark backdrop */}
        <p id="email-subject" className="mb-2 text-center text-sm text-white/60">
          Your {monthName} Faith Journey — Worship Room
        </p>

        {/* Email container */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="email-subject"
          className="relative max-h-[85vh] w-full max-w-[600px] overflow-y-auto rounded-2xl bg-gray-100 shadow-xl"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close email preview"
            className="absolute right-3 top-3 z-10 min-h-[44px] min-w-[44px] rounded-full bg-black/20 p-2 text-white transition-colors hover:bg-black/40"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Email content — light theme */}
          <div className="mx-4 my-4 rounded-xl bg-white">
            {/* Header banner */}
            <div className="rounded-t-xl bg-gradient-to-r from-purple-600 to-purple-800 p-6 text-center">
              <p className="text-xl font-bold text-white">Your Faith Journey</p>
              <p className="mt-1 text-sm text-white/80">{monthName} Report</p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 p-6">
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-2xl font-bold text-gray-800">24</p>
                <p className="text-xs text-gray-500">Days Active (of 31)</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-2xl font-bold text-gray-800">1,847</p>
                <p className="text-xs text-gray-500">Points Earned</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-sm font-semibold text-gray-800">
                  Sprout → Blooming
                </p>
                <p className="text-xs text-gray-500">Level Progress</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">↑ 12%</p>
                <p className="text-xs text-gray-500">Mood Trend</p>
              </div>
            </div>

            {/* Heatmap placeholder */}
            <div className="px-6">
              <div className="flex h-24 items-center justify-center rounded-lg bg-gray-200 text-sm text-gray-500">
                Your mood calendar
              </div>
            </div>

            {/* Highlight */}
            <div className="px-6 py-4">
              <div className="rounded-lg bg-purple-50 p-4 text-center">
                <p className="text-sm font-medium text-purple-800">
                  Your longest streak: 7 days
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="px-6 pb-4 text-center">
              <div className="mx-auto w-fit rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white">
                View Full Report
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 text-center">
              <p className="text-xs text-gray-400">Worship Room</p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="mt-3 text-center text-xs text-white/40">
          Email reports coming soon. This is a preview of what your monthly
          email will look like.
        </p>
      </div>
    </div>
  )
}
