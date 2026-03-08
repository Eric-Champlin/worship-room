interface SceneUndoToastProps {
  undoAvailable: boolean
  sceneName: string
  onUndo: () => void
}

export function SceneUndoToast({ undoAvailable, sceneName, onUndo }: SceneUndoToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-20 left-1/2 z-[9998] -translate-x-1/2 sm:bottom-8 sm:left-auto sm:right-8 sm:translate-x-0"
    >
      {undoAvailable && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-[rgba(15,10,30,0.9)] px-4 py-3 shadow-lg backdrop-blur-sm">
          <span className="text-sm text-white">Switched to {sceneName}.</span>
          <button
            type="button"
            onClick={onUndo}
            className="text-sm font-medium text-primary-lt transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  )
}
