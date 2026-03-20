import { useEffect, useRef, useCallback } from 'react'
import { Copy, Image, Download } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { generateVerseImage } from '@/lib/verse-card-canvas'

interface VerseSharePanelProps {
  verseText: string
  verseReference: string
  isOpen: boolean
  onClose: () => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

export function VerseSharePanel({
  verseText,
  verseReference,
  isOpen,
  onClose,
  triggerRef,
}: VerseSharePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

  const getItems = useCallback((): HTMLElement[] => {
    if (!panelRef.current) return []
    return Array.from(panelRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]'))
  }, [])

  useEffect(() => {
    if (!isOpen) return

    requestAnimationFrame(() => {
      getItems()[0]?.focus()
    })

    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose()
        triggerRef.current?.focus()
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose, triggerRef, getItems])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = getItems()
      const currentIndex = items.indexOf(e.target as HTMLElement)
      if (currentIndex === -1) return

      let nextIndex: number | null = null
      if (e.key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % items.length
      } else if (e.key === 'ArrowUp') {
        nextIndex = (currentIndex - 1 + items.length) % items.length
      } else if (e.key === 'Home') {
        nextIndex = 0
      } else if (e.key === 'End') {
        nextIndex = items.length - 1
      }

      if (nextIndex !== null) {
        e.preventDefault()
        items[nextIndex]?.focus()
      }
    },
    [getItems],
  )

  const handleCopy = async () => {
    const text = `"${verseText}" — ${verseReference}`
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Fallback: hidden textarea
      try {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      } catch {
        showToast('Failed to copy', 'error')
        onClose()
        triggerRef.current?.focus()
        return
      }
    }
    showToast('Copied!', 'success')
    onClose()
    triggerRef.current?.focus()
  }

  const handleShareImage = async () => {
    try {
      const blob = await generateVerseImage(verseText, verseReference)
      const file = new File([blob], `worship-room-verse-${formatDate()}.png`, {
        type: 'image/png',
      })

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] })
          onClose()
          triggerRef.current?.focus()
          return
        } catch {
          // User cancelled — fall through to download
        }
      }

      downloadBlob(blob)
    } catch {
      showToast('Failed to generate image', 'error')
    }
    onClose()
    triggerRef.current?.focus()
  }

  const handleDownload = async () => {
    try {
      const blob = await generateVerseImage(verseText, verseReference)
      downloadBlob(blob)
    } catch {
      showToast('Failed to generate image', 'error')
    }
    onClose()
    triggerRef.current?.focus()
  }

  if (!isOpen) return null

  const itemClass =
    'flex w-full items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 cursor-pointer text-sm text-white/80 hover:text-white transition-colors min-h-[44px] focus-visible:outline-none focus-visible:bg-white/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white'

  return (
    <div
      ref={panelRef}
      role="menu"
      aria-label="Share verse options"
      className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-white/15 bg-hero-mid p-2 shadow-lg"
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        role="menuitem"
        tabIndex={-1}
        onClick={handleCopy}
        className={itemClass}
      >
        <Copy className="h-4 w-4" aria-hidden="true" />
        Copy verse
      </button>
      <button
        type="button"
        role="menuitem"
        tabIndex={-1}
        onClick={handleShareImage}
        className={itemClass}
      >
        <Image className="h-4 w-4" aria-hidden="true" />
        Share as image
      </button>
      <button
        type="button"
        role="menuitem"
        tabIndex={-1}
        onClick={handleDownload}
        className={itemClass}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Download image
      </button>
    </div>
  )
}

function formatDate(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function downloadBlob(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `worship-room-verse-${formatDate()}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
