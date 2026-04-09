import { useCallback, useRef, useState } from 'react'
import { Download, Upload, X } from 'lucide-react'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { useToast } from '@/components/ui/Toast'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { buildExport } from '@/lib/bible/exportBuilder'
import { validateExport } from '@/lib/bible/importValidator'
import { applyReplace, applyMerge } from '@/lib/bible/importApplier'
import type { BibleExportV1 } from '@/types/bible-export'

interface BibleSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: () => void
}

type ImportState =
  | { step: 'idle' }
  | { step: 'preview'; export: BibleExportV1 }
  | { step: 'error'; message: string }
  | { step: 'importing' }

function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  let relative: string
  if (diffDays === 0) relative = 'Today'
  else if (diffDays === 1) relative = 'Yesterday'
  else if (diffDays < 7) relative = `${diffDays} days ago`
  else if (diffDays < 30) relative = `${Math.floor(diffDays / 7)} weeks ago`
  else relative = `${Math.floor(diffDays / 30)} months ago`

  const absolute = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  return `${relative} · ${absolute}`
}

export function BibleSettingsModal({ isOpen, onClose, onImportComplete }: BibleSettingsModalProps) {
  const { showToast } = useToast()
  const [importState, setImportState] = useState<ImportState>({ step: 'idle' })
  const [replaceWarningVisible, setReplaceWarningVisible] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset state on close
  const handleClose = useCallback(() => {
    setImportState({ step: 'idle' })
    setReplaceWarningVisible(false)
    onClose()
  }, [onClose])

  // Focus trap + Escape key
  const panelRef = useFocusTrap(isOpen, handleClose)

  if (!isOpen) return null

  // --- Export ---
  function handleExport() {
    const exportData = buildExport()
    const json = JSON.stringify(exportData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const date = exportData.exportedAt.slice(0, 10)
    const filename = `worship-room-bible-export-${date}.json`

    // iOS Safari fallback
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (isIOS && !('showSaveFilePicker' in window)) {
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      showToast('Tap and hold the page to save the file', 'success')
      return
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('Export downloaded', 'success')
  }

  // --- Import: file selection ---
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string)
        const validation = validateExport(parsed)
        if (validation.valid) {
          setImportState({ step: 'preview', export: validation.export })
        } else {
          setImportState({ step: 'error', message: validation.error })
        }
      } catch {
        setImportState({
          step: 'error',
          message: "This file isn't a valid Worship Room export. It might be corrupted or from a different app.",
        })
      }
    }
    reader.readAsText(file)

    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  // --- Import: apply ---
  function handleReplace(data: BibleExportV1['data']) {
    setImportState({ step: 'importing' })
    const result = applyReplace(data)
    showToast(`Imported ${result.totalItems} items`, 'success')
    setImportState({ step: 'idle' })
    onImportComplete()
  }

  function handleMerge(data: BibleExportV1['data']) {
    setImportState({ step: 'importing' })
    const result = applyMerge(data)
    showToast(`Imported ${result.totalItems} items`, 'success')
    setImportState({ step: 'idle' })
    onImportComplete()
  }

  // --- Counts for preview ---
  function getCounts(data: BibleExportV1['data']) {
    return [
      { label: 'highlights', count: data.highlights.length },
      { label: 'bookmarks', count: data.bookmarks.length },
      { label: 'notes', count: data.notes.length },
      { label: 'prayers', count: data.prayers.length },
      { label: 'journals', count: data.journals.length },
      { label: 'meditations', count: data.meditations.length },
    ]
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden border border-white/[0.12] pt-12 sm:mx-4 sm:max-w-lg sm:rounded-2xl sm:pt-0"
        style={{ background: 'rgba(15, 10, 30, 0.95)', backdropFilter: 'blur(16px)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Bible Settings"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4 pt-6">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-11 w-11 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Close settings"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-6 pb-6">
          {/* Export section */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Export your data</h3>
            <p className="text-sm text-white/60">
              Download a JSON file with all your highlights, notes, bookmarks, and saved entries.
              You can restore it on any device — no account needed.
            </p>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-hero-bg transition-all hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            >
              <Download size={16} />
              Download export
            </button>
          </section>

          {/* Divider */}
          <hr className="my-6 border-white/[0.08]" />

          {/* Import section */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Import data</h3>
            <p className="text-sm text-white/60">
              Upload a JSON file you've exported from Worship Room. You can replace your current data
              or merge it with what's here.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Choose a JSON file to import"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 text-sm text-white/60 transition-colors hover:bg-white/[0.09]"
            >
              <Upload size={16} />
              Choose file
            </button>
          </section>

          {/* Error state */}
          {importState.step === 'error' && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-danger">{importState.message}</p>
              <button
                type="button"
                onClick={() => setImportState({ step: 'idle' })}
                className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/60 transition-all hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Import preview */}
          {importState.step === 'preview' && (
            <div className="mt-4 space-y-4">
              <FrostedCard className="space-y-4">
                {/* Source info */}
                <div className="space-y-1">
                  <p className="text-sm text-white/60">
                    {formatRelativeDate(importState.export.exportedAt)}
                  </p>
                  <p className="text-xs text-white/40">{importState.export.appVersion}</p>
                </div>

                {/* Counts grid */}
                <div className="grid grid-cols-2 gap-2">
                  {getCounts(importState.export.data).map(({ label, count }) => (
                    <div key={label} className="rounded-lg bg-white/[0.04] px-3 py-2">
                      <span className="text-sm font-semibold text-white">{count}</span>{' '}
                      <span className="text-sm text-white/60">{label}</span>
                    </div>
                  ))}
                </div>
              </FrostedCard>

              {/* Replace warning */}
              <p
                role="alert"
                id="replace-warning"
                className={`text-xs text-danger transition-opacity ${replaceWarningVisible ? 'opacity-100' : 'opacity-0'}`}
              >
                Replace will delete your current highlights, notes, and saved entries. This cannot be undone.
              </p>

              {/* Action buttons */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => handleReplace(importState.export.data)}
                  onFocus={() => setReplaceWarningVisible(true)}
                  onBlur={() => setReplaceWarningVisible(false)}
                  onMouseEnter={() => setReplaceWarningVisible(true)}
                  onMouseLeave={() => setReplaceWarningVisible(false)}
                  aria-describedby="replace-warning"
                  className="min-h-[44px] rounded-full border border-danger/40 bg-danger/10 px-5 py-2.5 text-sm font-semibold text-danger transition-all hover:bg-danger/20"
                >
                  Replace local data
                </button>
                <button
                  type="button"
                  onClick={() => handleMerge(importState.export.data)}
                  className="min-h-[44px] rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary/80"
                >
                  Merge with local data
                </button>
                <button
                  type="button"
                  onClick={() => setImportState({ step: 'idle' })}
                  className="min-h-[44px] rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/60 transition-all hover:bg-white/5"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Importing state */}
          {importState.step === 'importing' && (
            <div className="mt-4">
              <p className="text-sm text-white/60">Importing...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
