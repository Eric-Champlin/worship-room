interface CircleNetworkProps {
  size?: 'small' | 'large'
}

export function CircleNetwork({ size = 'small' }: CircleNetworkProps) {
  const s = size === 'small'
    ? { w: 120, h: 80, r: 12 }
    : { w: 200, h: 120, r: 16 }

  return (
    <div className="flex justify-center" aria-hidden="true" data-testid="circle-network">
      <svg width={s.w} height={s.h} viewBox={`0 0 ${s.w} ${s.h}`}>
        {/* Connection lines */}
        <line x1={s.w * 0.25} y1={s.h * 0.3} x2={s.w * 0.5} y2={s.h * 0.5} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <line x1={s.w * 0.5} y1={s.h * 0.5} x2={s.w * 0.75} y2={s.h * 0.3} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <line x1={s.w * 0.5} y1={s.h * 0.5} x2={s.w * 0.35} y2={s.h * 0.75} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <line x1={s.w * 0.5} y1={s.h * 0.5} x2={s.w * 0.65} y2={s.h * 0.75} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <line x1={s.w * 0.25} y1={s.h * 0.3} x2={s.w * 0.35} y2={s.h * 0.75} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

        {/* Circles (nodes) */}
        <circle cx={s.w * 0.25} cy={s.h * 0.3} r={s.r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
        <circle cx={s.w * 0.75} cy={s.h * 0.3} r={s.r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
        <circle cx={s.w * 0.5} cy={s.h * 0.5} r={s.r * 1.2} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
        <circle cx={s.w * 0.35} cy={s.h * 0.75} r={s.r * 0.8} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
        <circle cx={s.w * 0.65} cy={s.h * 0.75} r={s.r * 0.8} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
      </svg>
    </div>
  )
}
