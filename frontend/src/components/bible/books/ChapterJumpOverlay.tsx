import { cn } from '@/lib/utils'

interface ChapterJumpOverlayProps {
  digits: string
  visible: boolean
}

export function ChapterJumpOverlay({ digits, visible }: ChapterJumpOverlayProps) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-4 flex justify-center transition-opacity motion-reduce:transition-none duration-base',
        visible ? 'opacity-100' : 'opacity-0',
      )}
      aria-live="polite"
    >
      <div className="rounded-lg bg-hero-mid/90 px-4 py-2 backdrop-blur-sm">
        <span className="font-mono text-2xl tabular-nums text-white">
          {digits || '\u00A0'}
        </span>
      </div>
    </div>
  )
}
