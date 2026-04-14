export function BibleLandingOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* Orb 1 — top right, frames the hero */}
      <div
        className="absolute w-[360px] h-[360px] md:w-[600px] md:h-[600px] blur-[60px] md:blur-[80px] will-change-transform"
        style={{
          top: '10%',
          right: '15%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.30) 0%, rgba(139, 92, 246, 0.12) 40%, transparent 70%)',
        }}
      />
      {/* Orb 2 — mid left, behind VOTD card area */}
      <div
        className="absolute w-[300px] h-[300px] md:w-[500px] md:h-[500px] blur-[60px] md:blur-[80px] will-change-transform"
        style={{
          top: '45%',
          left: '10%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, rgba(139, 92, 246, 0.10) 40%, transparent 70%)',
        }}
      />
      {/* Orb 3 — lower right, behind quick actions */}
      <div
        className="absolute w-[240px] h-[240px] md:w-[400px] md:h-[400px] blur-[60px] md:blur-[80px] will-change-transform"
        style={{
          top: '75%',
          right: '20%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.28) 0%, rgba(139, 92, 246, 0.10) 40%, transparent 70%)',
        }}
      />
    </div>
  )
}
