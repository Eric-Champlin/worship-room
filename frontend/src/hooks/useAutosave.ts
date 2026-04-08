import { useCallback, useEffect, useRef, useState } from 'react'

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseAutosaveOptions {
  value: string
  onSave: (value: string) => void | Promise<void>
  delay?: number
  enabled?: boolean
}

interface UseAutosaveReturn {
  status: AutosaveStatus
  flush: () => void
  lastSavedAt: number | null
}

export function useAutosave({
  value,
  onSave,
  delay = 2000,
  enabled = true,
}: UseAutosaveOptions): UseAutosaveReturn {
  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedValueRef = useRef<string | null>(null)
  const onSaveRef = useRef(onSave)
  const valueRef = useRef(value)

  // Keep refs current
  onSaveRef.current = onSave
  valueRef.current = value

  const doSave = useCallback(async (val: string) => {
    if (val === lastSavedValueRef.current) return

    setStatus('saving')
    try {
      await onSaveRef.current(val)
      lastSavedValueRef.current = val
      setStatus('saved')
      setLastSavedAt(Date.now())
    } catch {
      setStatus('error')
    }
  }, [])

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    doSave(valueRef.current)
  }, [doSave])

  // Debounced autosave on value change
  useEffect(() => {
    if (!enabled) return
    if (value === lastSavedValueRef.current) return

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      doSave(value)
    }, delay)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [value, delay, enabled, doSave])

  return { status, flush, lastSavedAt }
}
