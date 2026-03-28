import { useState, useRef, useCallback, useEffect } from 'react'

interface DragState {
  draggingIndex: number | null
  overIndex: number | null
}

interface UseDragReorderOptions<T> {
  items: T[]
  onReorder: (items: T[]) => void
}

export function useDragReorder<T>({ items, onReorder }: UseDragReorderOptions<T>) {
  const [dragState, setDragState] = useState<DragState>({ draggingIndex: null, overIndex: null })
  const listRef = useRef<HTMLDivElement>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startYRef = useRef(0)
  const isDraggingRef = useRef(false)

  const handleDragStart = useCallback((index: number, clientY: number, isTouch: boolean) => {
    if (isTouch) {
      // Long press for mobile
      startYRef.current = clientY
      longPressTimerRef.current = setTimeout(() => {
        isDraggingRef.current = true
        setDragState({ draggingIndex: index, overIndex: index })
      }, 300)
    } else {
      // Immediate drag for desktop
      isDraggingRef.current = true
      startYRef.current = clientY
      setDragState({ draggingIndex: index, overIndex: index })
    }
  }, [])

  const handleDragMove = useCallback((clientY: number) => {
    if (!isDraggingRef.current || !listRef.current) return

    const listItems = listRef.current.querySelectorAll('[data-drag-item]')
    let newOverIndex = dragState.draggingIndex ?? 0

    for (let i = 0; i < listItems.length; i++) {
      const rect = listItems[i].getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      if (clientY < midY) {
        newOverIndex = i
        break
      }
      newOverIndex = i
    }

    setDragState((prev) => ({ ...prev, overIndex: newOverIndex }))
  }, [dragState.draggingIndex])

  const handleDragEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    if (!isDraggingRef.current || dragState.draggingIndex === null || dragState.overIndex === null) {
      isDraggingRef.current = false
      setDragState({ draggingIndex: null, overIndex: null })
      return
    }

    isDraggingRef.current = false

    if (dragState.draggingIndex !== dragState.overIndex) {
      const newItems = [...items]
      const [removed] = newItems.splice(dragState.draggingIndex, 1)
      newItems.splice(dragState.overIndex, 0, removed)
      onReorder(newItems)
    }

    setDragState({ draggingIndex: null, overIndex: null })
  }, [dragState.draggingIndex, dragState.overIndex, items, onReorder])

  const cancelDrag = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    isDraggingRef.current = false
    setDragState({ draggingIndex: null, overIndex: null })
  }, [])

  // Global pointer/touch event listeners for drag
  useEffect(() => {
    if (!isDraggingRef.current && dragState.draggingIndex === null) return

    function handlePointerMove(e: PointerEvent) {
      handleDragMove(e.clientY)
    }

    function handlePointerUp() {
      handleDragEnd()
    }

    function handleTouchMove(e: TouchEvent) {
      if (isDraggingRef.current) {
        e.preventDefault()
        handleDragMove(e.touches[0].clientY)
      }
    }

    function handleTouchEnd() {
      handleDragEnd()
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [dragState.draggingIndex, handleDragMove, handleDragEnd])

  // Keyboard reorder support
  const [keyboardActiveIndex, setKeyboardActiveIndex] = useState<number | null>(null)

  const handleKeyboardReorder = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (keyboardActiveIndex === null) {
          // Pick up
          setKeyboardActiveIndex(index)
        } else {
          // Drop
          if (keyboardActiveIndex !== index) {
            const newItems = [...items]
            const [removed] = newItems.splice(keyboardActiveIndex, 1)
            newItems.splice(index, 0, removed)
            onReorder(newItems)
          }
          setKeyboardActiveIndex(null)
        }
      } else if (e.key === 'Escape') {
        if (keyboardActiveIndex !== null) {
          e.preventDefault()
          e.stopPropagation()
          setKeyboardActiveIndex(null)
        }
      } else if (keyboardActiveIndex !== null) {
        if (e.key === 'ArrowDown' && keyboardActiveIndex < items.length - 1) {
          e.preventDefault()
          const newItems = [...items]
          const [removed] = newItems.splice(keyboardActiveIndex, 1)
          const newIndex = keyboardActiveIndex + 1
          newItems.splice(newIndex, 0, removed)
          onReorder(newItems)
          setKeyboardActiveIndex(newIndex)
        } else if (e.key === 'ArrowUp' && keyboardActiveIndex > 0) {
          e.preventDefault()
          const newItems = [...items]
          const [removed] = newItems.splice(keyboardActiveIndex, 1)
          const newIndex = keyboardActiveIndex - 1
          newItems.splice(newIndex, 0, removed)
          onReorder(newItems)
          setKeyboardActiveIndex(newIndex)
        }
      }
    },
    [keyboardActiveIndex, items, onReorder],
  )

  return {
    dragState,
    listRef,
    handleDragStart,
    handleDragEnd,
    cancelDrag,
    keyboardActiveIndex,
    handleKeyboardReorder,
  }
}
