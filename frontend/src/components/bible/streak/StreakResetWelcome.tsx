interface StreakResetWelcomeProps {
  previousStreak: number
  onContinue: () => void
}

export function StreakResetWelcome({ previousStreak, onContinue }: StreakResetWelcomeProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <h1 className="text-3xl font-bold text-white">Welcome back.</h1>
        {previousStreak > 1 && (
          <p className="text-lg text-white/60">
            Your previous streak was {previousStreak} days. That mattered.
          </p>
        )}
        <p className="text-lg text-white/80">
          Today is day 1 of whatever comes next.
        </p>
        <button
          type="button"
          onClick={onContinue}
          className="min-h-[44px] rounded-full bg-white px-8 py-3 font-semibold text-hero-bg transition-all hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
