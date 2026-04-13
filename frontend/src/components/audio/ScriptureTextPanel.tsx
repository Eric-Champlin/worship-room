import { useEffect, useRef, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface ScriptureTextPanelProps {
  webText: string
  currentPosition: number
  duration: number
}

export function ScriptureTextPanel({
  webText,
  currentPosition,
  duration,
}: ScriptureTextPanelProps) {
  const verses = useMemo(() => webText.split('\n').filter((v) => v.trim()), [webText])

  const activeIndex = useMemo(() => {
    if (duration <= 0 || verses.length === 0) return 0
    const progress = Math.min(currentPosition / duration, 1)
    return Math.min(Math.floor(progress * verses.length), verses.length - 1)
  }, [currentPosition, duration, verses.length])

  const activeRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (activeRef.current && typeof activeRef.current.scrollIntoView === 'function') {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [activeIndex])

  return (
    <div
      id="scripture-text-panel"
      role="region"
      aria-label="Scripture text"
      className="max-h-48 overflow-y-auto rounded-lg p-4"
      style={{ background: 'rgba(15, 10, 30, 0.6)' }}
    >
      {verses.map((verse, i) => (
        <p
          key={i}
          ref={i === activeIndex ? activeRef : undefined}
          className={cn(
            'py-1 font-serif text-sm leading-relaxed text-white/85 transition-colors duration-base',
            i === activeIndex && 'border-l-2 border-primary bg-primary/10 pl-3',
          )}
        >
          {verse}
        </p>
      ))}
    </div>
  )
}
