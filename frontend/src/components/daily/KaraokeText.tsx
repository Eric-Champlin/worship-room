import { cn } from '@/lib/utils'

interface KaraokeTextProps {
  text: string
  currentWordIndex: number
  className?: string
}

export function KaraokeText({
  text,
  currentWordIndex,
  className,
}: KaraokeTextProps) {
  const words = text.split(/\s+/)

  return (
    <p className={cn('leading-relaxed', className)}>
      {words.map((word, index) => (
        <span
          key={`${index}-${word}`}
          className={cn(
            'transition-colors duration-150 motion-reduce:transition-none',
            index === currentWordIndex && 'rounded bg-primary/20',
          )}
        >
          {word}
          {index < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </p>
  )
}
