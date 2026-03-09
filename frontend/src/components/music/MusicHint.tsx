interface MusicHintProps {
  text: string
  visible: boolean
  position: 'above' | 'below'
  onDismiss: () => void
}

export function MusicHint({
  text,
  visible,
  position,
  onDismiss,
}: MusicHintProps) {
  if (!visible) return null

  return (
    <div
      role="status"
      className={`absolute left-1/2 z-30 -translate-x-1/2 ${
        position === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'
      }`}
    >
      <div className="pointer-events-none animate-fade-in rounded-lg bg-primary/90 px-3 py-2 text-xs text-white shadow-lg">
        <p className="whitespace-nowrap">{text}</p>
        <span
          className={`motion-safe:animate-pulse block text-center text-xs leading-none ${
            position === 'above' ? 'mt-0.5' : '-order-1 mb-0.5'
          }`}
          aria-hidden="true"
        >
          {position === 'above' ? '\u25BC' : '\u25B2'}
        </span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss hint"
        className="sr-only focus:not-sr-only focus:absolute focus:right-0 focus:top-0 focus:rounded focus:bg-white focus:px-2 focus:py-1 focus:text-xs focus:text-primary focus:ring-2 focus:ring-primary"
      >
        Dismiss
      </button>
    </div>
  )
}
