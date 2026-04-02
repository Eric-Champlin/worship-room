import { cn } from '@/lib/utils'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'

interface SectionHeadingProps {
  heading: string
  tagline?: string
  align?: 'center' | 'left'
  className?: string
}

export function SectionHeading({
  heading,
  tagline,
  align = 'center',
  className,
}: SectionHeadingProps) {
  const isCenter = align === 'center'

  return (
    <div className={cn(isCenter && 'text-center', className)}>
      <h2
        className="text-3xl sm:text-4xl lg:text-5xl font-bold"
        style={GRADIENT_TEXT_STYLE}
      >
        {heading}
      </h2>
      {tagline && (
        <p
          className={cn(
            'text-base sm:text-lg text-white/60 mt-3 max-w-2xl',
            isCenter && 'mx-auto'
          )}
        >
          {tagline}
        </p>
      )}
    </div>
  )
}
