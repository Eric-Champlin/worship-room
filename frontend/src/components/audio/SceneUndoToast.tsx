import { Z } from '@/constants/z-index'

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
      className={`fixed bottom-20 left-1/2 z-[${Z.UPDATE_PROMPT}] -translate-x-1/2 sm:bottom-8 sm:left-auto sm:right-8 sm:translate-x-0`}
    >
      {undoAvailable && (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
          <span className="text-sm text-text-dark">Switched to {sceneName}.</span>
          <button
            type="button"
            onClick={onUndo}
            className="text-sm font-medium text-primary transition-colors hover:text-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  )
}
