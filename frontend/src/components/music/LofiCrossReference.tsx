interface LofiCrossReferenceProps {
  onNavigate: () => void
}

export function LofiCrossReference({ onNavigate }: LofiCrossReferenceProps) {
  return (
    <button
      type="button"
      onClick={onNavigate}
      className="w-full cursor-pointer rounded-xl border border-white/10 bg-[rgba(15,10,30,0.3)] p-4 text-left transition-colors hover:bg-[rgba(15,10,30,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:p-5"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/80">Want music with your mix?</p>
          <p className="text-sm font-medium text-primary-lt">
            Try Christian Lofi
          </p>
        </div>
        <span className="text-lg text-white/60" aria-hidden="true">
          &rarr;
        </span>
      </div>
    </button>
  )
}
