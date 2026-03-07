import type { ReactNode } from 'react'

interface LocalSupportHeroProps {
  headingId: string
  title: string
  subtitle: string
  extraContent?: ReactNode
  action?: ReactNode
}

export function LocalSupportHero({
  headingId,
  title,
  subtitle,
  extraContent,
  action,
}: LocalSupportHeroProps) {
  return (
    <section
      aria-labelledby={headingId}
      className="relative flex w-full flex-col items-center px-4 pt-32 pb-10 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40 lg:pb-14"
      style={{
        backgroundImage:
          'linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #F5F5F5 100%)',
      }}
    >
      <h1
        id={headingId}
        className="mb-3 font-script text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl"
      >
        {title}
      </h1>
      <p className="mx-auto max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
        {subtitle}
      </p>
      {extraContent && <div className="mt-4">{extraContent}</div>}
      {action && <div className="mt-6">{action}</div>}
    </section>
  )
}
