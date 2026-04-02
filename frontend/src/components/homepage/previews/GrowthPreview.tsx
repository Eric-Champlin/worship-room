export function GrowthPreview() {
  return (
    <div className="rounded-xl bg-white/[0.03] p-4 sm:p-5">
      {/* SVG Garden */}
      <div className="flex justify-center mb-4">
        <svg
          viewBox="0 0 200 100"
          className="w-full max-w-[200px] h-auto"
          aria-hidden="true"
        >
          {/* Ground */}
          <rect
            x="0"
            y="85"
            width="200"
            height="15"
            rx="4"
            fill="#34D399"
            opacity="0.2"
          />
          {/* Plant stem */}
          <line
            x1="100"
            y1="85"
            x2="100"
            y2="40"
            stroke="#34D399"
            strokeWidth="2"
          />
          {/* Leaves */}
          <ellipse
            cx="90"
            cy="55"
            rx="12"
            ry="6"
            fill="#34D399"
            opacity="0.6"
            transform="rotate(-30 90 55)"
          />
          <ellipse
            cx="110"
            cy="48"
            rx="12"
            ry="6"
            fill="#34D399"
            opacity="0.5"
            transform="rotate(25 110 48)"
          />
          <ellipse
            cx="95"
            cy="42"
            rx="10"
            ry="5"
            fill="#34D399"
            opacity="0.7"
            transform="rotate(-15 95 42)"
          />
          {/* Flower */}
          <circle cx="100" cy="35" r="6" fill="#8B5CF6" opacity="0.7" />
          <circle cx="100" cy="35" r="2.5" fill="#F59E0B" />
          {/* Sun */}
          <circle cx="170" cy="20" r="10" fill="#F59E0B" opacity="0.3" />
          {/* Butterfly */}
          <ellipse
            cx="45"
            cy="30"
            rx="5"
            ry="3"
            fill="#8B5CF6"
            opacity="0.4"
            transform="rotate(-20 45 30)"
          />
          <ellipse
            cx="55"
            cy="30"
            rx="5"
            ry="3"
            fill="#FFFFFF"
            opacity="0.2"
            transform="rotate(20 55 30)"
          />
          <circle cx="50" cy="31" r="1" fill="#FFFFFF" opacity="0.5" />
        </svg>
      </div>

      {/* Stat rows */}
      <div className="space-y-2">
        <p className="text-white/70 text-sm">14-day streak</p>
        <p className="text-white/50 text-xs">
          Day 5 of 21 — Knowing Who You Are in Christ
        </p>
      </div>
    </div>
  )
}
