import { useEffect, useState } from 'react'

interface NotificationPromptProps {
  onEnable: () => void
  onDismiss: () => void
  iosNeedsInstall: boolean
}

export function NotificationPrompt({ onEnable, onDismiss, iosNeedsInstall }: NotificationPromptProps) {
  const [visible, setVisible] = useState(false)

  // Slide-up entrance animation after mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div
      role="complementary"
      aria-label="Notification prompt"
      className={[
        // Base
        'fixed z-50 transition-all duration-300 ease-out',
        // Mobile: full-width bottom
        'bottom-0 left-0 right-0 rounded-t-2xl',
        // Desktop: bottom-right card
        'sm:bottom-4 sm:right-4 sm:left-auto sm:max-w-[400px] sm:rounded-2xl',
        // Frosted glass
        'bg-white/[0.08] backdrop-blur-md border border-white/15 shadow-lg',
        // Entrance animation
        visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0',
      ].join(' ')}
      style={{
        paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
        paddingTop: '1.25rem',
        paddingLeft: '1.25rem',
        paddingRight: '1.25rem',
      }}
    >
      {iosNeedsInstall ? (
        <>
          <h3 className="text-base font-semibold text-white mb-2">
            Get verse notifications on iOS
          </h3>
          <p className="text-sm text-white/80 mb-4">
            To receive daily verse notifications, add Worship Room to your home screen first:
            Tap Share &rarr; &quot;Add to Home Screen&quot;
          </p>
          <button
            type="button"
            onClick={onDismiss}
            className="bg-white text-hero-dark rounded-full px-6 py-2 font-semibold text-sm hover:bg-white/90 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary w-full sm:w-auto"
          >
            Got it
          </button>
        </>
      ) : (
        <>
          <h3 className="text-base font-semibold text-white mb-2">
            Never miss your daily verse
          </h3>
          <p className="text-sm text-white/80 mb-4">
            Get a verse delivered to your device each morning, plus a gentle reminder if you
            haven&apos;t read yet.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onEnable}
              className="bg-white text-hero-dark rounded-full px-6 py-2 font-semibold text-sm hover:bg-white/90 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary w-full sm:w-auto"
            >
              Enable
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="text-white/60 text-sm font-medium hover:text-white/80 transition-colors min-h-[44px] sm:ml-1"
            >
              Maybe later
            </button>
          </div>
        </>
      )}
    </div>
  )
}
