import { cn } from '@/lib/utils'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'

interface SectionHeadingProps {
  heading?: string
  topLine?: string
  bottomLine?: string
  tagline?: string
  align?: 'center' | 'left'
  className?: string
  id?: string
}

export function SectionHeading({
  heading,
  topLine,
  bottomLine,
  tagline,
  align = 'center',
  className,
  id,
}: SectionHeadingProps) {
  const isCenter = align === 'center'

  return (
    <div className={cn(isCenter && 'text-center', className)}>
      {topLine && bottomLine ? (
        <h2 id={id}>
          <span className="block text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
            {topLine}
          </span>
          <span
            className="block text-3xl sm:text-4xl lg:text-6xl font-bold leading-tight mt-1 pb-2 max-w-full break-words"
            style={GRADIENT_TEXT_STYLE}
          >
            {bottomLine}
          </span>
        </h2>
      ) : (
        <h2
          id={id}
          className="text-3xl sm:text-4xl lg:text-5xl font-bold"
          style={GRADIENT_TEXT_STYLE}
        >
          {heading}
        </h2>
      )}
      {tagline && (
        <p
          className={cn(
            'text-base sm:text-lg text-white mt-4 max-w-2xl',
            isCenter && 'mx-auto'
          )}
        >
          {tagline}
        </p>
      )}
    </div>
  )
}
