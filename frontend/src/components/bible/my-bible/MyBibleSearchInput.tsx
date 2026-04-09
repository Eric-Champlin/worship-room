import { useRef, useCallback, useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MyBibleSearchInputProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function MyBibleSearchInput({ value, onChange, className }: MyBibleSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [localValue, setLocalValue] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  // Sync external value changes (e.g., clear from empty state)
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value
      setLocalValue(v)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => onChange(v), 150)
    },
    [onChange],
  )

  const handleClear = useCallback(() => {
    setLocalValue('')
    onChange('')
    inputRef.current?.focus()
  }, [onChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLocalValue('')
        onChange('')
        inputRef.current?.blur()
      }
    },
    [onChange],
  )

  // Cleanup timer on unmount
  useEffect(() => () => clearTimeout(timerRef.current), [])

  return (
    <div className={cn('relative', className)}>
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50"
      />
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Search your highlights, notes, prayers..."
        aria-label="Search your highlights, notes, prayers, and bookmarks"
        className="min-h-[44px] w-full rounded-xl border border-white/[0.12] bg-white/[0.06] py-2 pl-9 pr-9 text-sm text-white backdrop-blur-sm placeholder:text-white/50 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded text-white/50 hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
