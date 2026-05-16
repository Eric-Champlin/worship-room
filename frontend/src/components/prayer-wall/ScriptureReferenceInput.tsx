import { useEffect, useId, useRef, useState } from 'react'
import { Check, AlertCircle } from 'lucide-react'
import { parseReference } from '@/lib/search/reference-parser'
import { loadChapterWeb } from '@/data/bible'

interface ScriptureReferenceInputProps {
  /** Called whenever the validated reference + text pair changes.
   *  Both null = field empty, invalid, or chapter-only; both set = valid + text loaded. */
  onChange: (reference: string | null, text: string | null) => void
  /** Called when validity state transitions in/out of `'invalid'`.
   *  True = current input is invalid; false = empty / chapter-only / valid.
   *  Allows the composer to disable submit on invalid (D12) since the three
   *  non-emitting states all share `(null, null)` from `onChange`. */
  onValidityChange?: (isInvalid: boolean) => void
  /** Spec 7.1 — when set, the field starts with this raw input value
   *  and the validation effect runs immediately on mount (so a valid
   *  reference auto-resolves without keystrokes). Uncontrolled —
   *  the parent bumps `key={...}` to push a new initial value after mount. */
  initialRawInput?: string
}

type LookupState = 'empty' | 'invalid' | 'chapter-only' | 'looking-up' | 'valid'

export function ScriptureReferenceInput({
  onChange,
  onValidityChange,
  initialRawInput,
}: ScriptureReferenceInputProps) {
  const [rawInput, setRawInput] = useState(initialRawInput ?? '')
  const [state, setState] = useState<LookupState>('empty')
  const [resolvedText, setResolvedText] = useState<string | null>(null)
  const lookupSeqRef = useRef(0)
  const inputId = useId()
  const noteId = useId()
  const errorId = useId()

  useEffect(() => {
    const trimmed = rawInput.trim()

    // 1. Empty
    if (trimmed === '') {
      lookupSeqRef.current++ // invalidate any in-flight lookup
      setState('empty')
      setResolvedText(null)
      onChange(null, null)
      return
    }

    // 2. Parse
    const parsed = parseReference(trimmed)

    // 2a. Invalid
    if (!parsed) {
      lookupSeqRef.current++
      setState('invalid')
      setResolvedText(null)
      onChange(null, null)
      return
    }

    // 2b. Chapter-only (D9): valid for navigation but no pair to commit
    if (parsed.verse === undefined) {
      lookupSeqRef.current++
      setState('chapter-only')
      setResolvedText(null)
      onChange(null, null)
      return
    }

    // 3. Valid reference with verse → debounced async lookup
    setState('looking-up')
    const seq = ++lookupSeqRef.current

    const handle = setTimeout(async () => {
      const chapter = await loadChapterWeb(parsed.book, parsed.chapter)
      // Stale-response guard: only the most recent lookup wins
      if (seq !== lookupSeqRef.current) return
      const verse = chapter?.verses.find((v) => v.number === parsed.verse)
      if (verse) {
        setState('valid')
        setResolvedText(verse.text)
        onChange(trimmed, verse.text)
      } else {
        setState('invalid')
        setResolvedText(null)
        onChange(null, null)
      }
    }, 300)

    return () => clearTimeout(handle)
  }, [rawInput, onChange])

  useEffect(() => {
    onValidityChange?.(state === 'invalid')
  }, [state, onValidityChange])

  const ariaDescribedBy =
    state === 'invalid' ? errorId : state === 'chapter-only' ? noteId : undefined

  return (
    <div className="mt-3">
      <label htmlFor={inputId} className="mb-1 block text-sm text-white/70">
        Scripture reference (optional)
      </label>
      <div className="relative">
        <input
          id={inputId}
          type="text"
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          placeholder="e.g., Romans 8:28"
          className="w-full rounded-lg border border-white/10 bg-white/[0.06] p-3 pr-10 text-white placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/30"
          aria-invalid={state === 'invalid' ? 'true' : undefined}
          aria-describedby={ariaDescribedBy}
        />
        {state === 'valid' && (
          <Check
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-300"
            aria-hidden="true"
          />
        )}
        {state === 'invalid' && (
          <AlertCircle
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-300"
            aria-hidden="true"
          />
        )}
      </div>

      {state === 'valid' && resolvedText && (
        <p className="mt-2 text-sm text-white/70">
          <span className="font-medium text-white/50">WEB:</span> {resolvedText}
        </p>
      )}

      {state === 'chapter-only' && (
        <p id={noteId} className="mt-2 text-sm text-white/60">
          Specify a verse to attach scripture (e.g., Romans 8:28).
        </p>
      )}

      {state === 'invalid' && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-red-200">
          That reference doesn&apos;t match a Bible book and chapter.
        </p>
      )}
    </div>
  )
}
