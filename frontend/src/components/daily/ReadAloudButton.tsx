import { useEffect } from 'react'
import { Play, Pause, Square } from 'lucide-react'
import { useReadAloud } from '@/hooks/useReadAloud'
import { cn } from '@/lib/utils'

interface ReadAloudButtonProps {
  text: string
  className?: string
  onWordIndexChange?: (index: number) => void
}

export function ReadAloudButton({
  text,
  className,
  onWordIndexChange,
}: ReadAloudButtonProps) {
  const { state, currentWordIndex, play, pause, resume, stop } =
    useReadAloud()

  useEffect(() => {
    onWordIndexChange?.(currentWordIndex)
  }, [currentWordIndex, onWordIndexChange])

  const buttonBase =
    'inline-flex items-center justify-center rounded-lg border border-gray-200 p-2 text-text-dark transition-colors hover:bg-gray-100'

  if (state === 'idle') {
    return (
      <button
        type="button"
        onClick={() => play(text)}
        className={cn(buttonBase, className)}
        aria-label="Read aloud"
      >
        <Play className="h-4 w-4" />
      </button>
    )
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {state === 'playing' ? (
        <button
          type="button"
          onClick={pause}
          className={buttonBase}
          aria-label="Pause"
        >
          <Pause className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={resume}
          className={buttonBase}
          aria-label="Resume"
        >
          <Play className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        onClick={stop}
        className={buttonBase}
        aria-label="Stop"
      >
        <Square className="h-4 w-4" />
      </button>
    </div>
  )
}
