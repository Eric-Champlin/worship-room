const PRAYERS = [
  {
    initials: 'S.M.',
    name: 'Sarah M.',
    text: 'Please pray for my family during this difficult season...',
    count: 12,
  },
  {
    initials: 'D.K.',
    name: 'David K.',
    text: 'Grateful for a new job opportunity. Praying for wisdom...',
    count: 8,
  },
  {
    initials: 'R.P.',
    name: 'Rachel P.',
    text: 'Asking for peace and healing after a recent loss...',
    count: 15,
  },
]

export function PrayerWallPreview() {
  return (
    <div className="rounded-xl bg-white/[0.03] p-4 sm:p-5 space-y-0">
      {/* Stacked prayer cards */}
      {PRAYERS.map((prayer, i) => (
        <div
          key={prayer.initials}
          className="bg-white/[0.04] rounded-lg p-3 border border-white/[0.06] relative"
          style={{
            marginTop: i > 0 ? '-8px' : undefined,
            zIndex: (i + 1) * 10,
          }}
        >
          <div className="flex gap-2">
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold flex items-center justify-center shrink-0">
              {prayer.initials}
            </div>

            {/* Content */}
            <div className="min-w-0">
              <p className="text-white/70 text-xs font-medium">{prayer.name}</p>
              <p className="text-white/50 text-xs truncate">{prayer.text}</p>
              <p className="text-white/30 text-[10px] mt-0.5">
                {prayer.count} praying
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* Decorative pill */}
      <div className="pt-3 flex justify-center" style={{ position: 'relative', zIndex: 40 }}>
        <span className="bg-white/[0.06] text-white/50 text-xs rounded-full px-3 py-1">
          Pray for someone
        </span>
      </div>
    </div>
  )
}
