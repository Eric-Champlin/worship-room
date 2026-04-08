interface FocusVignetteProps {
  visible: boolean
  reducedMotion: boolean
}

export function FocusVignette({ visible, reducedMotion }: FocusVignetteProps) {
  const transitionMs = reducedMotion ? 0 : 600

  return (
    <>
      {/* Top vignette */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-20"
        style={{
          height: 'clamp(80px, 10vh, 120px)',
          background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.12), transparent)',
          opacity: visible ? 1 : 0,
          transition: `opacity ${transitionMs}ms ease`,
        }}
        aria-hidden="true"
      />
      {/* Bottom vignette */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-20"
        style={{
          height: 'clamp(80px, 10vh, 120px)',
          background: 'linear-gradient(to top, rgba(0, 0, 0, 0.12), transparent)',
          opacity: visible ? 1 : 0,
          transition: `opacity ${transitionMs}ms ease`,
        }}
        aria-hidden="true"
      />
    </>
  )
}
