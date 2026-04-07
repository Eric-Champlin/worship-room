/** Deterministic star field — ~110 small white dots scattered across the Daily Hub. */

const STARS: Array<{ top: number; left: number; size: 1 | 2; opacity: number }> = [
  // Row 0-10%
  { top: 1, left: 12, size: 1, opacity: 0.35 },
  { top: 2, left: 67, size: 1, opacity: 0.42 },
  { top: 3, left: 34, size: 2, opacity: 0.38 },
  { top: 4, left: 89, size: 1, opacity: 0.31 },
  { top: 5, left: 5, size: 1, opacity: 0.45 },
  { top: 5, left: 52, size: 2, opacity: 0.33 },
  { top: 6, left: 78, size: 1, opacity: 0.40 },
  { top: 7, left: 23, size: 1, opacity: 0.37 },
  { top: 8, left: 95, size: 1, opacity: 0.30 },
  { top: 9, left: 41, size: 2, opacity: 0.48 },
  { top: 10, left: 60, size: 1, opacity: 0.34 },
  // Row 10-20%
  { top: 11, left: 8, size: 1, opacity: 0.43 },
  { top: 12, left: 73, size: 2, opacity: 0.36 },
  { top: 13, left: 29, size: 1, opacity: 0.50 },
  { top: 14, left: 56, size: 1, opacity: 0.32 },
  { top: 15, left: 84, size: 2, opacity: 0.39 },
  { top: 16, left: 3, size: 1, opacity: 0.44 },
  { top: 16, left: 47, size: 1, opacity: 0.35 },
  { top: 17, left: 18, size: 1, opacity: 0.41 },
  { top: 18, left: 91, size: 2, opacity: 0.33 },
  { top: 19, left: 63, size: 1, opacity: 0.47 },
  { top: 20, left: 37, size: 1, opacity: 0.30 },
  // Row 20-30%
  { top: 21, left: 82, size: 1, opacity: 0.38 },
  { top: 22, left: 15, size: 2, opacity: 0.52 },
  { top: 23, left: 50, size: 1, opacity: 0.34 },
  { top: 24, left: 70, size: 1, opacity: 0.45 },
  { top: 25, left: 26, size: 2, opacity: 0.31 },
  { top: 25, left: 97, size: 1, opacity: 0.40 },
  { top: 26, left: 44, size: 1, opacity: 0.36 },
  { top: 27, left: 6, size: 1, opacity: 0.53 },
  { top: 28, left: 58, size: 2, opacity: 0.42 },
  { top: 29, left: 87, size: 1, opacity: 0.30 },
  { top: 30, left: 33, size: 1, opacity: 0.46 },
  // Row 30-40%
  { top: 31, left: 75, size: 1, opacity: 0.37 },
  { top: 32, left: 10, size: 2, opacity: 0.44 },
  { top: 33, left: 48, size: 1, opacity: 0.55 },
  { top: 34, left: 93, size: 1, opacity: 0.33 },
  { top: 35, left: 21, size: 1, opacity: 0.39 },
  { top: 35, left: 64, size: 2, opacity: 0.41 },
  { top: 36, left: 39, size: 1, opacity: 0.30 },
  { top: 37, left: 81, size: 1, opacity: 0.48 },
  { top: 38, left: 2, size: 2, opacity: 0.35 },
  { top: 39, left: 55, size: 1, opacity: 0.43 },
  { top: 40, left: 28, size: 1, opacity: 0.38 },
  // Row 40-50%
  { top: 41, left: 71, size: 2, opacity: 0.32 },
  { top: 42, left: 16, size: 1, opacity: 0.50 },
  { top: 43, left: 88, size: 1, opacity: 0.36 },
  { top: 44, left: 42, size: 1, opacity: 0.45 },
  { top: 45, left: 61, size: 2, opacity: 0.31 },
  { top: 45, left: 7, size: 1, opacity: 0.42 },
  { top: 46, left: 53, size: 1, opacity: 0.38 },
  { top: 47, left: 96, size: 1, opacity: 0.34 },
  { top: 48, left: 31, size: 2, opacity: 0.47 },
  { top: 49, left: 77, size: 1, opacity: 0.40 },
  { top: 50, left: 19, size: 1, opacity: 0.55 },
  // Row 50-60%
  { top: 51, left: 85, size: 1, opacity: 0.33 },
  { top: 52, left: 45, size: 2, opacity: 0.41 },
  { top: 53, left: 66, size: 1, opacity: 0.37 },
  { top: 54, left: 11, size: 1, opacity: 0.49 },
  { top: 55, left: 38, size: 1, opacity: 0.30 },
  { top: 55, left: 90, size: 2, opacity: 0.43 },
  { top: 56, left: 24, size: 1, opacity: 0.35 },
  { top: 57, left: 74, size: 1, opacity: 0.52 },
  { top: 58, left: 51, size: 2, opacity: 0.38 },
  { top: 59, left: 4, size: 1, opacity: 0.44 },
  { top: 60, left: 83, size: 1, opacity: 0.31 },
  // Row 60-70%
  { top: 61, left: 36, size: 2, opacity: 0.46 },
  { top: 62, left: 69, size: 1, opacity: 0.34 },
  { top: 63, left: 14, size: 1, opacity: 0.40 },
  { top: 64, left: 57, size: 2, opacity: 0.53 },
  { top: 65, left: 92, size: 1, opacity: 0.37 },
  { top: 65, left: 43, size: 1, opacity: 0.32 },
  { top: 66, left: 79, size: 1, opacity: 0.48 },
  { top: 67, left: 22, size: 2, opacity: 0.35 },
  { top: 68, left: 62, size: 1, opacity: 0.42 },
  { top: 69, left: 9, size: 1, opacity: 0.39 },
  { top: 70, left: 46, size: 1, opacity: 0.30 },
  // Row 70-80%
  { top: 71, left: 86, size: 2, opacity: 0.45 },
  { top: 72, left: 30, size: 1, opacity: 0.51 },
  { top: 73, left: 72, size: 1, opacity: 0.33 },
  { top: 74, left: 1, size: 1, opacity: 0.40 },
  { top: 75, left: 54, size: 2, opacity: 0.36 },
  { top: 75, left: 94, size: 1, opacity: 0.43 },
  { top: 76, left: 17, size: 1, opacity: 0.38 },
  { top: 77, left: 65, size: 2, opacity: 0.50 },
  { top: 78, left: 40, size: 1, opacity: 0.31 },
  { top: 79, left: 80, size: 1, opacity: 0.44 },
  { top: 80, left: 25, size: 1, opacity: 0.35 },
  // Row 80-90%
  { top: 81, left: 59, size: 2, opacity: 0.47 },
  { top: 82, left: 13, size: 1, opacity: 0.33 },
  { top: 83, left: 76, size: 1, opacity: 0.41 },
  { top: 84, left: 35, size: 2, opacity: 0.55 },
  { top: 85, left: 98, size: 1, opacity: 0.30 },
  { top: 85, left: 49, size: 1, opacity: 0.39 },
  { top: 86, left: 68, size: 1, opacity: 0.45 },
  { top: 87, left: 20, size: 2, opacity: 0.34 },
  { top: 88, left: 87, size: 1, opacity: 0.42 },
  { top: 89, left: 42, size: 1, opacity: 0.37 },
  { top: 90, left: 57, size: 1, opacity: 0.50 },
  // Row 90-100%
  { top: 91, left: 3, size: 2, opacity: 0.32 },
  { top: 92, left: 81, size: 1, opacity: 0.46 },
  { top: 93, left: 27, size: 1, opacity: 0.38 },
  { top: 94, left: 63, size: 2, opacity: 0.43 },
  { top: 95, left: 48, size: 1, opacity: 0.35 },
  { top: 95, left: 14, size: 1, opacity: 0.51 },
  { top: 96, left: 72, size: 1, opacity: 0.30 },
  { top: 97, left: 38, size: 2, opacity: 0.44 },
  { top: 98, left: 91, size: 1, opacity: 0.37 },
  { top: 99, left: 55, size: 1, opacity: 0.40 },
]

export function StarField() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
      {STARS.map((star, i) => (
        <div
          key={i}
          className={`absolute rounded-full bg-white ${star.size === 1 ? 'h-px w-px' : 'h-0.5 w-0.5'}`}
          style={{
            top: `${star.top}%`,
            left: `${star.left}%`,
            opacity: star.opacity,
          }}
        />
      ))}
    </div>
  )
}
