interface VolumeSliderProps {
  value: number // 0-100
  onChange: (value: number) => void
  label?: string
  ariaLabel: string
}

export function VolumeSlider({ value, onChange, label, ariaLabel }: VolumeSliderProps) {
  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-xs font-medium text-white/70">{label}</span>}
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel}
        aria-valuetext={`${value} percent`}
        className="audio-slider h-1 min-h-[44px] w-full cursor-pointer appearance-none rounded-full"
        style={{
          background: `linear-gradient(to right, #6D28D9 0%, #6D28D9 ${value}%, #374151 ${value}%, #374151 100%)`,
        }}
      />
      <span className="w-8 text-right text-xs tabular-nums text-white/70">
        {value}%
      </span>
    </div>
  )
}
