import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useIsMobile } from '@/hooks/useIsMobile'
import { updateHighlightColor, removeHighlightsInRange } from '@/lib/bible/highlightStore'
import { setBookmarkLabel, removeBookmark } from '@/lib/bible/bookmarkStore'
import { deleteNote } from '@/lib/bible/notes/store'
import { navigateToActivityItem } from '@/lib/bible/navigateToActivityItem'
import { HIGHLIGHT_EMOTIONS } from '@/constants/bible'
import type { ActivityItem } from '@/types/my-bible'
import type { HighlightColor } from '@/types/bible'

interface ActivityActionMenuProps {
  item: ActivityItem
  position: { x: number; y: number }
  onClose: () => void
  onMutate: () => void
}

function clampPosition(x: number, y: number, width: number, height: number) {
  const clampedX = Math.min(x, window.innerWidth - width - 16)
  const clampedY = Math.min(y, window.innerHeight - height - 16)
  return { x: Math.max(16, clampedX), y: Math.max(16, clampedY) }
}

export function ActivityActionMenu({ item, position, onClose, onMutate }: ActivityActionMenuProps) {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const containerRef = useFocusTrap(true, onClose)
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelValue, setLabelValue] = useState(
    item.data.type === 'bookmark' ? (item.data.label ?? '') : '',
  )
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuSize, setMenuSize] = useState({ width: 240, height: 200 })

  useEffect(() => {
    if (menuRef.current) {
      setMenuSize({
        width: menuRef.current.offsetWidth,
        height: menuRef.current.offsetHeight,
      })
    }
  }, [editingLabel, confirmingDelete])

  const clamped = clampPosition(position.x, position.y, menuSize.width, menuSize.height)

  const handleOpenInReader = useCallback(() => {
    navigateToActivityItem(navigate, item)
    onClose()
  }, [navigate, item, onClose])

  const handleChangeColor = useCallback(
    (color: HighlightColor) => {
      updateHighlightColor(item.id, color)
      onMutate()
      onClose()
    },
    [item.id, onMutate, onClose],
  )

  const handleRemoveHighlight = useCallback(() => {
    removeHighlightsInRange({
      book: item.book,
      chapter: item.chapter,
      startVerse: item.startVerse,
      endVerse: item.endVerse,
    })
    onMutate()
    onClose()
  }, [item, onMutate, onClose])

  const handleRemoveBookmark = useCallback(() => {
    removeBookmark(item.id)
    onMutate()
    onClose()
  }, [item.id, onMutate, onClose])

  const handleSaveLabel = useCallback(() => {
    setBookmarkLabel(item.id, labelValue)
    setEditingLabel(false)
    onMutate()
    onClose()
  }, [item.id, labelValue, onMutate, onClose])

  const handleDeleteNote = useCallback(() => {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    deleteNote(item.id)
    onMutate()
    onClose()
  }, [item.id, confirmingDelete, onMutate, onClose])

  const actionButtonClasses =
    'w-full text-left px-4 py-2.5 text-sm text-white/80 hover:bg-white/[0.08] transition-colors focus-visible:outline-none focus-visible:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50'

  const menuContent = (
    <div ref={menuRef} className="py-1">
      {/* Highlight actions */}
      {item.data.type === 'highlight' && (
        <>
          <div className="px-4 py-2">
            <p className="mb-2 text-xs text-white/50">Change color</p>
            <div className="flex gap-2">
              {HIGHLIGHT_EMOTIONS.map((emotion) => (
                <button
                  key={emotion.key}
                  type="button"
                  onClick={() => handleChangeColor(emotion.key)}
                  className="h-7 w-7 rounded-full transition-transform motion-reduce:transition-none hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(15,10,30,0.95)]"
                  style={{ backgroundColor: emotion.hex }}
                  aria-label={`Change to ${emotion.label}`}
                  title={emotion.label}
                />
              ))}
            </div>
          </div>
          <button type="button" className={actionButtonClasses} onClick={handleRemoveHighlight}>
            Remove
          </button>
        </>
      )}

      {/* Bookmark actions */}
      {item.data.type === 'bookmark' && (
        <>
          {editingLabel ? (
            <div className="px-4 py-2">
              <input
                type="text"
                value={labelValue}
                onChange={(e) => setLabelValue(e.target.value.slice(0, 80))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveLabel()
                  if (e.key === 'Escape') setEditingLabel(false)
                }}
                onBlur={handleSaveLabel}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white outline-none focus:border-primary"
                placeholder="Add a label..."
                maxLength={80}
                autoFocus
              />
            </div>
          ) : (
            <button
              type="button"
              className={actionButtonClasses}
              onClick={() => setEditingLabel(true)}
            >
              Edit label
            </button>
          )}
          <button type="button" className={actionButtonClasses} onClick={handleRemoveBookmark}>
            Remove
          </button>
        </>
      )}

      {/* Note actions */}
      {item.data.type === 'note' && (
        <>
          <button type="button" className={actionButtonClasses} onClick={handleOpenInReader}>
            Edit
          </button>
          {confirmingDelete ? (
            <div className="px-4 py-2 space-y-2">
              <p className="text-sm text-white/70">Delete this note?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-red-500/20 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                  onClick={handleDeleteNote}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white/60 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  onClick={() => setConfirmingDelete(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className={actionButtonClasses} onClick={handleDeleteNote}>
              Delete
            </button>
          )}
        </>
      )}

      {/* Common: Open in reader */}
      <button type="button" className={actionButtonClasses} onClick={handleOpenInReader}>
        Open in reader
      </button>
    </div>
  )

  // Mobile: bottom sheet
  if (isMobile) {
    return (
      <>
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          ref={containerRef}
          role="menu"
          className="fixed bottom-0 left-0 right-0 z-50 max-h-[50vh] overflow-y-auto rounded-t-2xl border-t border-white/[0.12] bg-[rgba(15,10,30,0.95)] backdrop-blur-[16px]"
        >
          {menuContent}
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </>
    )
  }

  // Desktop: positioned popover
  return (
    <>
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={containerRef}
        role="menu"
        className="fixed z-50 w-60 overflow-hidden rounded-xl border border-white/[0.12] bg-[rgba(15,10,30,0.95)] shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-[16px]"
        style={{ top: clamped.y, left: clamped.x }}
      >
        {menuContent}
      </div>
    </>
  )
}
