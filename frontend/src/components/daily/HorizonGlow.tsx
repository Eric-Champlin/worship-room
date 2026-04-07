/** Five soft purple/lavender glow spots positioned at strategic vertical percentages. */

const GLOWS = [
  { top: 5, left: 50, width: 500, height: 400, blur: 120, color: '139, 92, 246', opacity: 0.60 },
  { top: 15, left: 30, width: 450, height: 350, blur: 110, color: '186, 156, 255', opacity: 0.55 },
  { top: 35, left: 65, width: 550, height: 450, blur: 120, color: '139, 92, 246', opacity: 0.65 },
  { top: 60, left: 40, width: 500, height: 400, blur: 100, color: '168, 130, 255', opacity: 0.58 },
  { top: 85, left: 55, width: 480, height: 380, blur: 110, color: '139, 92, 246', opacity: 0.55 },
]

export function HorizonGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
      {GLOWS.map((glow, i) => (
        <div
          key={i}
          className="absolute will-change-transform"
          style={{
            top: `${glow.top}%`,
            left: `${glow.left}%`,
            width: `${glow.width}px`,
            height: `${glow.height}px`,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, rgba(${glow.color}, ${glow.opacity}) 0%, transparent 70%)`,
            filter: `blur(${glow.blur}px)`,
          }}
        />
      ))}
    </div>
  )
}
