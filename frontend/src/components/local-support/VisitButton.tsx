import { useState, useRef, useEffect, useCallback } from 'react'
import { Check, MapPin } from 'lucide-react'
import { hasVisitedToday, addVisit, updateVisitNote, getVisitsByPlace } from '@/services/local-visit-storage'
import { getLocalDateString } from '@/utils/date'
import { cn } from '@/lib/utils'

interface VisitButtonProps {
  placeId: string
  placeName: string
  placeType: 'church' | 'counselor' | 'cr'
  onVisit: (placeId: string, placeName: string) => void
}

export interface VisitState {
  visited: boolean
  showNote: boolean
  note: string
  savedVisitId: string | null
  handleClick: () => void
  setNote: (note: string) => void
  saveNote: () => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  placeName: string
}

export function useVisitState({ placeId, placeName, placeType, onVisit }: VisitButtonProps): VisitState {
  const [visited, setVisited] = useState(() => hasVisitedToday(placeId))
  const [showNote, setShowNote] = useState(false)
  const [note, setNote] = useState(() => {
    if (!hasVisitedToday(placeId)) return ''
    const todayVisits = getVisitsByPlace(placeId).filter(v => v.visitDate === getLocalDateString())
    return todayVisits[0]?.note ?? ''
  })
  const [savedVisitId, setSavedVisitId] = useState<string | null>(() => {
    if (!hasVisitedToday(placeId)) return null
    const todayVisits = getVisitsByPlace(placeId).filter(v => v.visitDate === getLocalDateString())
    return todayVisits[0]?.id ?? null
  })

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null!)

  const handleClick = useCallback(() => {
    if (visited) {
      setShowNote(prev => !prev)
      return
    }

    const visit = addVisit({
      placeId,
      placeName,
      placeType,
      visitDate: getLocalDateString(),
      note: '',
    })

    setVisited(true)
    setSavedVisitId(visit.id)
    setShowNote(true)
    onVisit(placeId, placeName)

    // Focus textarea after state update
    setTimeout(() => textareaRef.current?.focus(), 100)
  }, [visited, placeId, placeName, placeType, onVisit])

  // Auto-save note on blur
  const saveNote = useCallback(() => {
    if (savedVisitId && note !== undefined) {
      updateVisitNote(savedVisitId, note)
    }
  }, [savedVisitId, note])

  // Debounced auto-save
  useEffect(() => {
    if (!savedVisitId) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateVisitNote(savedVisitId, note)
    }, 1000)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [note, savedVisitId])

  return { visited, showNote, note, savedVisitId, handleClick, setNote, saveNote, textareaRef, placeName }
}

export function VisitButton({ visitState }: { visitState: VisitState }) {
  const { visited, showNote, handleClick, placeName } = visitState

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={visited ? `Visited ${placeName} — click to ${showNote ? 'hide' : 'add'} note` : `Mark ${placeName} as visited`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors min-h-[44px]',
        visited
          ? 'text-success'
          : 'border border-gray-200 text-text-light hover:text-primary',
      )}
    >
      {visited ? (
        <>
          <Check size={16} aria-hidden="true" />
          <span className="hidden sm:inline">Visited {todayFormatted}</span>
        </>
      ) : (
        <>
          <MapPin size={16} aria-hidden="true" />
          <span className="hidden sm:inline">I visited</span>
        </>
      )}
    </button>
  )
}

export function VisitNote({ visitState }: { visitState: VisitState }) {
  const { showNote, note, setNote, saveNote, textareaRef, placeName } = visitState

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!showNote) return null

  return (
    <div
      className={cn(
        'mt-2',
        !prefersReducedMotion && 'animate-fade-in',
      )}
    >
      <textarea
        ref={textareaRef as React.RefObject<HTMLTextAreaElement>}
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, 300))}
        onBlur={saveNote}
        placeholder="How was your experience?"
        maxLength={300}
        rows={2}
        className="w-full resize-none rounded-lg border border-gray-200 p-3 text-sm text-text-dark placeholder:text-text-light/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 lg:max-w-[60%]"
        aria-label={`Note about your visit to ${placeName}`}
      />
      <span className="text-xs text-text-light/60">
        {note.length}/300
      </span>
    </div>
  )
}
