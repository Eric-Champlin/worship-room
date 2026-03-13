import { cn } from '@/lib/utils'

interface WaveformBarsProps {
  isPlaying: boolean
}

export function WaveformBars({ isPlaying }: WaveformBarsProps) {
  return (
    <div className="flex items-end gap-[2px]" aria-hidden="true">
      <div
        className={cn(
          'w-[2px] rounded-full bg-primary',
          isPlaying
            ? 'motion-safe:animate-waveform-bar-1 h-[4px]'
            : 'h-[10px]',
        )}
      />
      <div
        className={cn(
          'w-[2px] rounded-full bg-primary',
          isPlaying
            ? 'motion-safe:animate-waveform-bar-2 h-[8px]'
            : 'h-[10px]',
        )}
      />
      <div
        className={cn(
          'w-[2px] rounded-full bg-primary',
          isPlaying
            ? 'motion-safe:animate-waveform-bar-3 h-[6px]'
            : 'h-[10px]',
        )}
      />
    </div>
  )
}
