interface PlanFilterPillProps {
  label: string
  isActive: boolean
  onClick: () => void
}

export function PlanFilterPill({ label, isActive, onClick }: PlanFilterPillProps) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={`min-h-[44px] rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark ${
        isActive
          ? 'border-white/20 bg-white/15 text-white'
          : 'border-white/10 bg-transparent text-white/60 hover:text-white/80'
      }`}
    >
      {label}
    </button>
  )
}
