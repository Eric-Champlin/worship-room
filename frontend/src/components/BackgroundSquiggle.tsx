export const SQUIGGLE_MASK_STYLE = {
  maskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
} as const

export function BackgroundSquiggle({
  className,
  aspectRatio = 'xMidYMid slice',
}: {
  className?: string
  aspectRatio?: string
}) {
  return (
    <svg
      aria-hidden="true"
      className={className ?? 'pointer-events-none absolute inset-0 h-full w-full'}
      viewBox="0 0 1800 1350"
      preserveAspectRatio={aspectRatio}
      fill="none"
    >
      {/* Wide central brushstroke */}
      <path
        d="M600,0 C825,50 450,120 750,200 C1050,280 375,370 750,450 C1125,530 450,620 825,700 C1200,780 525,870 750,960 C975,1050 525,1140 750,1230 L750,1350"
        stroke="#D6D3D1"
        strokeWidth="100"
        strokeLinecap="round"
        opacity="0.25"
      />
      {/* Right sweeping stroke */}
      <path
        d="M1050,0 C1275,80 900,170 1200,260 C1500,350 975,440 1275,530 C1575,620 1050,710 1350,800 C1650,890 1125,960 1350,1050 C1575,1140 1200,1230 1425,1350"
        stroke="#D6D3D1"
        strokeWidth="80"
        strokeLinecap="round"
        opacity="0.18"
      />
      {/* Left sweeping stroke */}
      <path
        d="M300,50 C525,130 150,220 450,310 C750,400 225,490 525,580 C825,670 300,760 525,850 C750,940 375,1030 525,1120 C750,1210 375,1280 525,1350"
        stroke="#E7E5E4"
        strokeWidth="90"
        strokeLinecap="round"
        opacity="0.22"
      />
      {/* Thin central accent for depth */}
      <path
        d="M825,20 C1050,100 600,190 900,280 C1200,370 675,460 975,550 C1275,640 750,730 1020,820 C1290,910 825,1000 1020,1090 C1215,1180 825,1270 975,1350"
        stroke="#D6D3D1"
        strokeWidth="30"
        strokeLinecap="round"
        opacity="0.15"
      />
      {/* Far-left thin accent */}
      <path
        d="M120,80 C300,160 0,250 225,340 C450,430 75,520 300,610 C525,700 150,790 300,880 C450,970 150,1060 300,1150 C450,1240 180,1300 300,1350"
        stroke="#E7E5E4"
        strokeWidth="45"
        strokeLinecap="round"
        opacity="0.15"
      />
      {/* Far-right thin accent */}
      <path
        d="M1500,30 C1680,110 1350,200 1575,290 C1800,380 1425,470 1620,560 C1815,650 1470,740 1620,830 C1770,920 1500,1010 1620,1100 C1770,1190 1500,1280 1620,1350"
        stroke="#E7E5E4"
        strokeWidth="45"
        strokeLinecap="round"
        opacity="0.15"
      />
    </svg>
  )
}
