import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, X, ArrowLeft, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useLongPress } from '@/hooks/useLongPress'
import { useToast } from '@/components/ui/Toast'
import {
  getPrimaryActions,
  getSecondaryActions,
  formatReference,
  copyToClipboard,
} from '@/lib/bible/verseActionRegistry'
import { getBookmarkForVerse } from '@/lib/bible/bookmarkStore'
import { BookmarkLabelEditor } from '@/components/bible/reader/BookmarkLabelEditor'
import type { VerseSelection, VerseAction, VerseActionHandler } from '@/types/verse-actions'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ICON_BTN_SM =
  'flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white'

const SWIPE_DISMISS_THRESHOLD = 80

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface VerseActionSheetProps {
  selection: VerseSelection
  isOpen: boolean
  onClose: (options?: { navigating?: boolean }) => void
  onExtendSelection: (verseNumber: number) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VerseActionSheet({
  selection,
  isOpen,
  onClose,
  onExtendSelection: _onExtendSelection, // reserved for future in-sheet selection UI
}: VerseActionSheetProps) {
  const routerNavigate = useNavigate()
  const reducedMotion = useReducedMotion()
  const { showToast } = useToast()
  const [isEntering, setIsEntering] = useState(true)
  const [subView, setSubView] = useState<{
    action: VerseAction
    handler: VerseActionHandler
  } | null>(null)
  const [announceText, setAnnounceText] = useState('')

  // Track which action button pushed the sub-view for focus restore
  const subViewTriggerRef = useRef<HTMLButtonElement | null>(null)

  // Bookmark label editor state (BB-7.5)
  const [labelEditorOpen, setLabelEditorOpen] = useState(false)
  const bookmarkBtnRef = useRef<HTMLButtonElement | null>(null)
  const { didFire: longPressDidFire, ...longPressTouchHandlers } = useLongPress(() => setLabelEditorOpen(true))

  // Forward showToast with optional action (for undo)
  const forwardShowToast = useCallback(
    (msg: string, type?: string, action?: { label: string; onClick: () => void }) => {
      if (action !== undefined) {
        showToast(msg, (type ?? 'success') as 'success' | 'error' | 'warning', action)
      } else if (type !== undefined) {
        showToast(msg, type as 'success' | 'error' | 'warning')
      } else {
        showToast(msg)
      }
    },
    [showToast],
  )

  // Reset label editor when sheet closes
  useEffect(() => {
    if (!isOpen) setLabelEditorOpen(false)
  }, [isOpen])

  // Swipe-down state
  const [swipeOffset, setSwipeOffset] = useState(0)
  const touchStartY = useRef(0)
  const touchStartTime = useRef(0)

  // Focus trap — Escape pops sub-view or closes sheet
  const handleEscape = useCallback(() => {
    if (subView) {
      setSubView(null)
    } else {
      onClose()
    }
  }, [subView, onClose])

  const containerRef = useFocusTrap(isOpen, handleEscape)

  // Entry animation flag
  useEffect(() => {
    if (isOpen) {
      setIsEntering(true)
      const timer = setTimeout(() => setIsEntering(false), 240)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Announce selection changes for screen readers
  useEffect(() => {
    if (isOpen && selection) {
      const ref = formatReference(selection)
      if (selection.startVerse === selection.endVerse) {
        setAnnounceText(`Actions for ${ref}`)
      } else {
        setAnnounceText(
          `Selected ${selection.bookName} ${selection.chapter}:${selection.startVerse} through ${selection.endVerse}`,
        )
      }
    }
  }, [isOpen, selection])

  // Reset sub-view when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setSubView(null)
    }
  }, [isOpen])

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (subView) return // Sub-views don't use number shortcuts

      const primary = getPrimaryActions()

      switch (e.key) {
        case '1':
        case '2':
        case '3':
        case '4': {
          const idx = parseInt(e.key) - 1
          const handler = primary[idx]
          if (handler) handleActionClick(handler, null)
          break
        }
        case 'c': {
          const copyHandler = getSecondaryActions().find((h) => h.action === 'copy')
          if (copyHandler) handleActionClick(copyHandler, null)
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, subView, selection]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Action handlers
  // ---------------------------------------------------------------------------

  const handleActionClick = useCallback(
    (handler: VerseActionHandler, triggerButton: HTMLButtonElement | null) => {
      if (handler.hasSubView) {
        subViewTriggerRef.current = triggerButton
        setSubView({ action: handler.action, handler })
        setAnnounceText(handler.label)
      } else {
        handler.onInvoke(selection, {
          showToast: forwardShowToast,
          closeSheet: onClose,
          navigate: (url) => routerNavigate(url),
        })
      }
    },
    [selection, forwardShowToast, onClose, routerNavigate],
  )

  const handleSubViewBack = useCallback(() => {
    setSubView(null)
    // Focus restore happens via useFocusTrap re-query + manual restore
    requestAnimationFrame(() => {
      subViewTriggerRef.current?.focus()
    })
  }, [])

  // ---------------------------------------------------------------------------
  // Copy reference (header button)
  // ---------------------------------------------------------------------------

  const handleCopyReference = useCallback(() => {
    const ref = formatReference(selection)
    void copyToClipboard(ref)
    showToast('Reference copied')
  }, [selection, showToast])

  // ---------------------------------------------------------------------------
  // Swipe-down to dismiss
  // ---------------------------------------------------------------------------

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    touchStartTime.current = Date.now()
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) {
      setSwipeOffset(delta)
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    const velocity = swipeOffset / (Date.now() - touchStartTime.current)
    if (swipeOffset > SWIPE_DISMISS_THRESHOLD || velocity > 0.5) {
      onClose()
    }
    setSwipeOffset(0)
  }, [swipeOffset, onClose])

  // ---------------------------------------------------------------------------
  // Verse preview text
  // ---------------------------------------------------------------------------

  const previewText = (() => {
    if (selection.verses.length === 1) {
      return selection.verses[0].text
    }
    const joined = selection.verses.map((v) => `${v.number} ${v.text}`).join(' ')
    return joined.length > 120 ? joined.slice(0, 117) + '...' : joined
  })()

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!isOpen) return null

  const primaryActions = getPrimaryActions()
  const secondaryActions = getSecondaryActions()
  const labelEditorBookmark = labelEditorOpen
    ? getBookmarkForVerse(selection.book, selection.chapter, selection.startVerse)
    : null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[10000] bg-black/30"
        onClick={() => onClose()}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Actions for ${formatReference(selection)}`}
        className={cn(
          'fixed z-[10001] flex flex-col overflow-hidden',
          // Mobile: full width, bottom edge
          'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t border-white/10',
          // Tablet+: 440px centered, 40px from bottom
          'sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-10 sm:w-[440px] sm:max-h-[85vh] sm:rounded-2xl sm:border sm:border-white/10',
          // Animation
          !reducedMotion && isEntering && 'animate-verse-sheet-slide-up',
        )}
        style={{
          background: 'rgba(15, 10, 30, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          transform: swipeOffset > 0 ? `translateY(${swipeOffset}px)` : undefined,
          transition: swipeOffset !== 0 ? 'none' : undefined,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Screen reader announcement */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {announceText}
        </div>

        {subView ? (
          /* ---------------------------------------------------------------- */
          /* Sub-view                                                         */
          /* ---------------------------------------------------------------- */
          <>
            <div className="flex items-center gap-2 px-4 py-3">
              <button
                onClick={handleSubViewBack}
                className={ICON_BTN_SM}
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <span className="flex-1 font-semibold text-white">{subView.handler.label}</span>
              <button onClick={() => onClose()} className={ICON_BTN_SM} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="border-t border-white/[0.08]" />
            <div className="flex-1 overflow-y-auto">
              {subView.handler.renderSubView?.({
                selection,
                onBack: handleSubViewBack,
                context: {
                  showToast: forwardShowToast,
                  closeSheet: onClose,
                  navigate: (url) => routerNavigate(url),
                },
              })}
            </div>
          </>
        ) : (
          /* ---------------------------------------------------------------- */
          /* Root view                                                        */
          /* ---------------------------------------------------------------- */
          <>
            {/* Header row */}
            <div className="flex items-center gap-2 px-4 py-3">
              <span className="flex-1 truncate font-serif text-lg font-semibold text-white">
                {formatReference(selection)}
              </span>
              {(() => {
                const hlState = primaryActions.find((h) => h.action === 'highlight')?.getState?.(selection)
                if (!hlState?.active) return null
                return (
                  <span
                    className="inline-block h-3 w-3 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: hlState.activeColor }}
                    aria-hidden="true"
                  />
                )
              })()}
              <button
                onClick={handleCopyReference}
                className={ICON_BTN_SM}
                aria-label="Copy reference"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={() => onClose()}
                className={ICON_BTN_SM}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-white/[0.08]" />

            {/* Verse preview strip */}
            <div className="px-4 py-2">
              <p className="line-clamp-2 text-sm text-white/50">{previewText}</p>
            </div>

            {/* Divider */}
            <div className="border-t border-white/[0.08]" />

            {/* Primary actions row */}
            <div className="flex justify-around px-4 py-3">
              {primaryActions.map((handler) => {
                const Icon = handler.icon
                const state = handler.getState?.(selection)
                const isBookmark = handler.action === 'bookmark'
                return (
                  <button
                    key={handler.action}
                    ref={isBookmark ? bookmarkBtnRef : undefined}
                    onClick={(e) => {
                      if (isBookmark && longPressDidFire.current) return
                      handleActionClick(handler, e.currentTarget)
                    }}
                    onContextMenu={isBookmark ? (e) => { e.preventDefault(); setLabelEditorOpen(true) } : undefined}
                    {...(isBookmark ? longPressTouchHandlers : {})}
                    className="flex min-h-[44px] min-w-[44px] flex-col items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors hover:bg-white/[0.06]"
                    aria-label={handler.label}
                  >
                    <span
                      style={state?.active ? { color: state.activeColor } : undefined}
                    >
                      <Icon
                        className={cn('h-6 w-6', state?.active ? '[&>*]:fill-current' : 'text-white/70')}
                      />
                    </span>
                    <span className="text-xs text-white/60">{handler.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Divider */}
            <div className="border-t border-white/[0.08]" />

            {/* Secondary actions list */}
            <div className="flex-1 overflow-y-auto px-2 py-1">
              {secondaryActions.map((handler) => {
                const Icon = handler.icon
                return (
                  <button
                    key={handler.action}
                    onClick={(e) =>
                      handleActionClick(handler, e.currentTarget)
                    }
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 min-h-[44px] text-left text-white transition-colors hover:bg-white/[0.06]"
                    aria-label={handler.label}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0 text-white/60" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-white">{handler.label}</span>
                      {handler.sublabel && (
                        <span className="block text-xs text-white/50">
                          {handler.sublabel}
                        </span>
                      )}
                    </div>
                    {handler.renderBadge?.(selection)}
                    {handler.hasSubView && (
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-white/30" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-white/[0.08] px-4 py-3 text-center">
              <span className="text-xs text-white/40">WEB · Public Domain</span>
            </div>
          </>
        )}
      </div>

      {/* Bookmark label editor popover (BB-7.5) */}
      {labelEditorOpen && (
        <BookmarkLabelEditor
          bookmarkId={labelEditorBookmark?.id ?? null}
          currentLabel={labelEditorBookmark?.label ?? ''}
          selection={selection}
          anchorRef={bookmarkBtnRef}
          onClose={() => setLabelEditorOpen(false)}
        />
      )}
    </>
  )
}
