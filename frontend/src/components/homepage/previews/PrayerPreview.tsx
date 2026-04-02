export function PrayerPreview() {
  return (
    <div className="rounded-xl bg-white/[0.03] p-4 sm:p-5 space-y-3 border border-white/[0.08] border-pulse-glow motion-reduce:border-white/[0.15]">
      {/* Input area with cyan glow */}
      <div
        className="rounded-lg bg-white/[0.04] px-3 py-2 border"
        style={{
          borderColor: 'rgba(0, 212, 255, 0.3)',
          boxShadow: '0 0 8px rgba(0, 212, 255, 0.1)',
        }}
      >
        <p className="text-white/60 text-sm italic">
          I'm feeling anxious about the future...
        </p>
      </div>

      {/* Static karaoke prayer text */}
      <div className="space-y-1 pt-1">
        <p className="text-sm leading-relaxed">
          <span className="text-white/90">
            Lord, I bring my anxiety before You today.{' '}
          </span>
          <span className="text-white/90">
            You know the fears that grip my heart{' '}
          </span>
          <span className="text-white/90">
            about what tomorrow holds.{' '}
          </span>
          <span className="text-white/20">
            Help me to rest in Your promises{' '}
          </span>
          <span className="text-white/20">
            and trust that You hold my future{' '}
          </span>
          <span className="text-white/20">in Your loving hands.</span>
        </p>
      </div>

      {/* Ambient waveform indicator */}
      <div className="flex items-end justify-end gap-[3px] pt-1">
        <div className="w-[3px] h-3 bg-purple-500/60 rounded-full" />
        <div className="w-[3px] h-5 bg-purple-500/80 rounded-full" />
        <div className="w-[3px] h-2 bg-purple-500/50 rounded-full" />
      </div>
    </div>
  )
}
