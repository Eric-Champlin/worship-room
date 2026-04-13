import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

interface ChapterSelectorProps {
  currentChapter: number
  totalChapters: number
  onSelectChapter: (chapter: number) => void
}

export function ChapterSelector({
  currentChapter,
  totalChapters,
  onSelectChapter,
}: ChapterSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const chapters = Array.from({ length: totalChapters }, (_, i) => i + 1)

  const handleSelect = useCallback(
    (chapter: number) => {
      onSelectChapter(chapter)
      setIsOpen(false)
      triggerRef.current?.focus()
    },
    [onSelectChapter],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault()
          setIsOpen(true)
          setFocusedIndex(currentChapter - 1)
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex((prev) => Math.min(prev + 1, totalChapters - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (focusedIndex >= 0) handleSelect(focusedIndex + 1)
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          triggerRef.current?.focus()
          break
      }
    },
    [isOpen, focusedIndex, totalChapters, currentChapter, handleSelect],
  )

  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || focusedIndex < 0) return
    const panel = panelRef.current
    if (!panel) return
    const items = panel.querySelectorAll('[role="option"]')
    items[focusedIndex]?.scrollIntoView?.({ block: 'nearest' })
  }, [isOpen, focusedIndex])

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) setFocusedIndex(currentChapter - 1)
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15"
      >
        Chapter {currentChapter} of {totalChapters}
        <ChevronDown
          size={16}
          className={cn('transition-transform motion-reduce:transition-none', isOpen && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          role="listbox"
          aria-label="Select a chapter"
          className="absolute z-30 mt-2 max-h-60 w-full min-w-[12rem] overflow-y-auto rounded-xl border border-white/15 bg-hero-mid py-2 shadow-lg"
        >
          {chapters.map((chapter, index) => {
            const isCurrent = chapter === currentChapter
            const isFocused = index === focusedIndex

            return (
              <div
                key={chapter}
                role="option"
                aria-selected={isCurrent}
                tabIndex={-1}
                onClick={() => handleSelect(chapter)}
                className={cn(
                  'flex cursor-pointer items-center px-4 py-2 text-sm text-white',
                  isCurrent && 'bg-white/10',
                  isFocused && !isCurrent && 'bg-white/5',
                  !isCurrent && 'hover:bg-white/10',
                )}
              >
                Chapter {chapter}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
