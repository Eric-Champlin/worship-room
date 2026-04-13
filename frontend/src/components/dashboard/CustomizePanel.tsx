import { useEffect, useRef, useState } from 'react'
import { GripVertical, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useDragReorder } from '@/hooks/useDragReorder'
import { WIDGET_MAP, WIDGET_DEFINITIONS, type WidgetId } from '@/constants/dashboard/widget-order'

interface CustomizePanelProps {
  isOpen: boolean
  onClose: () => void
  orderedWidgets: WidgetId[]
  hiddenWidgets: WidgetId[]
  onUpdateOrder: (newOrder: WidgetId[]) => void
  onToggleVisibility: (id: WidgetId, visible: boolean) => void
  onResetToDefault: () => void
}

export function CustomizePanel({
  isOpen,
  onClose,
  orderedWidgets,
  hiddenWidgets,
  onUpdateOrder,
  onToggleVisibility,
  onResetToDefault,
}: CustomizePanelProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const announcementRef = useRef<HTMLDivElement>(null)

  // Build the full list: visible widgets in order, then hidden widgets
  const hiddenSet = new Set(hiddenWidgets)
  const allWidgetIds = WIDGET_DEFINITIONS.map((w) => w.id)
  const fullList: WidgetId[] = [
    ...orderedWidgets,
    ...allWidgetIds.filter((id) => hiddenSet.has(id) && !orderedWidgets.includes(id)),
  ]

  const {
    dragState,
    listRef,
    handleDragStart,
    keyboardActiveIndex,
    handleKeyboardReorder,
  } = useDragReorder({
    items: fullList,
    onReorder: (newItems) => {
      onUpdateOrder(newItems.filter((id) => !hiddenSet.has(id)))
    },
  })

  // Animate open/close
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsAnimating(true))
      })
    } else {
      setIsAnimating(false)
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Focus trap
  const focusTrapRef = useFocusTrap(isOpen, () => {
    if (keyboardActiveIndex !== null) return // Don't close during keyboard reorder
    onClose()
  })

  // Announce position changes
  function announce(message: string) {
    if (announcementRef.current) {
      announcementRef.current.textContent = message
    }
  }

  useEffect(() => {
    if (keyboardActiveIndex !== null) {
      const widget = WIDGET_MAP[fullList[keyboardActiveIndex]]
      if (widget) {
        announce(`${widget.label} moved to position ${keyboardActiveIndex + 1} of ${fullList.length}`)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyboardActiveIndex])

  if (!isVisible) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 transition-opacity duration-base motion-reduce:transition-none',
          isAnimating ? 'bg-black/40' : 'bg-black/0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={(node) => {
          // Combine refs
          (focusTrapRef as React.MutableRefObject<HTMLDivElement | null>).current = node
        }}
        role="dialog"
        aria-label="Customize Dashboard"
        aria-modal="true"
        className={cn(
          'fixed z-50 flex flex-col bg-hero-mid/95 backdrop-blur-xl border border-white/15',
          // Mobile: bottom sheet
          'bottom-0 left-0 right-0 max-h-[80vh] rounded-t-2xl',
          // Desktop: side panel
          'sm:bottom-auto sm:top-0 sm:left-auto sm:right-0 sm:max-h-none sm:rounded-none sm:border-l sm:border-t-0 sm:border-r-0 sm:border-b-0',
          'sm:w-[360px] lg:w-[400px]',
          // Animation
          'transition-transform duration-base ease-standard motion-reduce:transition-none',
          // Mobile animation
          isAnimating ? 'translate-y-0' : 'translate-y-full',
          // Desktop animation override
          isAnimating ? 'sm:translate-y-0 sm:translate-x-0' : 'sm:translate-y-0 sm:translate-x-full',
        )}
      >
        {/* Mobile drag bar (decorative) */}
        <div className="flex justify-center sm:hidden">
          <div className="mt-3 h-1 w-10 rounded-full bg-white/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 sm:pt-6">
          <h2 className="text-base font-semibold text-white">Customize Dashboard</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* aria-live region for announcements */}
        <div
          ref={announcementRef}
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />

        {/* Widget list */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-4 py-2 space-y-2"
        >
          {fullList.map((id, index) => {
            const def = WIDGET_MAP[id]
            if (!def) return null
            const Icon = def.icon
            const isHidden = hiddenSet.has(id)
            const isDragging = dragState.draggingIndex === index
            const isKeyboardActive = keyboardActiveIndex === index

            return (
              <div
                key={id}
                data-drag-item
                className={cn(
                  'flex items-center gap-3 rounded-lg bg-white/[0.06] p-3 min-h-[44px]',
                  isDragging && 'shadow-lg scale-[1.02] motion-reduce:scale-100',
                  isKeyboardActive && 'ring-2 ring-primary',
                  isHidden && 'opacity-50',
                )}
                aria-roledescription="sortable"
                aria-label={`${def.label}, position ${index + 1} of ${fullList.length}${isHidden ? ', hidden' : ''}`}
                tabIndex={0}
                onKeyDown={(e) => handleKeyboardReorder(e, index)}
              >
                {/* Drag handle */}
                <button
                  type="button"
                  className="touch-none cursor-grab text-white/30 hover:text-white/60 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  aria-label={`Drag to reorder ${def.label}`}
                  onPointerDown={(e) => {
                    if (e.pointerType === 'touch') {
                      handleDragStart(index, e.clientY, true)
                    } else {
                      e.preventDefault()
                      handleDragStart(index, e.clientY, false)
                    }
                  }}
                >
                  <GripVertical className="h-5 w-5" />
                </button>

                {/* Icon + Name */}
                <Icon className="h-4 w-4 text-white/60 shrink-0" />
                <span className="flex-1 text-sm text-white truncate">{def.label}</span>

                {/* Toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={!isHidden}
                  aria-label={`Show ${def.label}`}
                  onClick={() => onToggleVisibility(id, isHidden)}
                  className={cn(
                    'relative inline-flex h-6 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors p-0',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark',
                    !isHidden ? 'bg-primary' : 'bg-white/20',
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-fast motion-reduce:transition-none',
                      !isHidden ? 'translate-x-[26px]' : 'translate-x-[2px]',
                    )}
                  />
                </button>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-4">
          <button
            onClick={() => {
              onResetToDefault()
              onClose()
            }}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/15 hover:text-white transition-[colors,transform] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]"
          >
            Reset to Default
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90 transition-[colors,transform] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]"
          >
            Done
          </button>
        </div>
      </div>
    </>
  )
}
