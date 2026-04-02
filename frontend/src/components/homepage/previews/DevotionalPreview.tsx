export function DevotionalPreview() {
  return (
    <div
      className="rounded-xl bg-white/[0.03] p-4 sm:p-5 space-y-3"
      style={{
        background:
          'linear-gradient(to bottom, rgba(139, 92, 246, 0.03), transparent)',
      }}
    >
      {/* Date stamp */}
      <p className="text-white/40 text-xs">April 2, 2026</p>

      {/* Quote in Caveat */}
      <p className="font-script text-white/80 italic text-lg sm:text-xl leading-relaxed">
        "Be still, and know that I am God."
      </p>

      {/* Divider */}
      <div className="border-t border-white/10" />

      {/* Passage reference */}
      <p className="text-white/50 text-sm">Psalm 46:10 (WEB)</p>

      {/* Body snippet */}
      <p className="text-white/60 text-sm leading-relaxed">
        In the chaos of daily life, God invites us to pause. This isn't passive
        waiting — it's an active surrender, a decision to trust that He is in
        control even when everything feels uncertain.
      </p>

      {/* Decorative pill buttons */}
      <div className="flex gap-2 pt-1">
        <span className="bg-white/[0.06] text-white/50 text-xs rounded-full px-3 py-1">
          Journal about this
        </span>
        <span className="bg-white/[0.06] text-white/50 text-xs rounded-full px-3 py-1">
          Pray about this
        </span>
      </div>
    </div>
  )
}
