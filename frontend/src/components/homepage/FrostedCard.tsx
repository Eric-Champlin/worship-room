import { cn } from '@/lib/utils'

type FrostedCardVariant = 'accent' | 'default' | 'subdued'

interface FrostedCardProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  as?: 'div' | 'button' | 'article' | 'section'
  tabIndex?: number
  role?: string
  onKeyDown?: React.KeyboardEventHandler
  variant?: FrostedCardVariant
  eyebrow?: string
  eyebrowColor?: 'violet' | 'white'
  /** Only meaningful when `as="button"`. Defaults to `"button"` to prevent
   * accidental form submission — HTML defaults `<button>` to `type="submit"`,
   * which is the wrong default for every current consumer. */
  type?: 'button' | 'submit' | 'reset'
  'aria-labelledby'?: string
  style?: React.CSSProperties
}

interface VariantClassSet {
  base: string
  hover: string
}

const VARIANT_CLASSES: Record<FrostedCardVariant, VariantClassSet> = {
  accent: {
    base: 'bg-violet-500/[0.08] backdrop-blur-md md:backdrop-blur-[12px] border border-violet-400/70 rounded-3xl p-6 shadow-frosted-accent relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/[0.10] before:to-transparent before:rounded-t-3xl before:pointer-events-none',
    hover: 'hover:bg-violet-500/[0.13] hover:shadow-frosted-accent-hover hover:-translate-y-0.5',
  },
  default: {
    base: 'bg-white/[0.07] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.12] rounded-3xl p-6 shadow-frosted-base',
    hover: 'hover:bg-white/[0.10] hover:shadow-frosted-hover hover:-translate-y-0.5',
  },
  subdued: {
    base: 'bg-white/[0.05] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.10] rounded-3xl p-5',
    hover: 'hover:bg-white/[0.04]',
  },
}

export function FrostedCard({
  children,
  onClick,
  className,
  as: Component = 'div',
  tabIndex,
  role,
  onKeyDown,
  variant = 'default',
  eyebrow,
  eyebrowColor,
  type,
  'aria-labelledby': ariaLabelledBy,
  style,
}: FrostedCardProps) {
  const isInteractive = !!onClick
  const variantClasses = VARIANT_CLASSES[variant]
  const buttonProps =
    Component === 'button' ? { type: type ?? 'button' } : {}

  return (
    <Component
      onClick={onClick}
      tabIndex={tabIndex}
      role={role}
      onKeyDown={onKeyDown}
      aria-labelledby={ariaLabelledBy}
      style={style}
      {...buttonProps}
      className={cn(
        variantClasses.base,
        'transition-all motion-reduce:transition-none duration-base ease-decelerate',
        isInteractive && [
          'cursor-pointer',
          variantClasses.hover,
          'motion-reduce:hover:translate-y-0',
          'active:scale-[0.98]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
        ],
        className,
      )}
    >
      {eyebrow ? (
        <div className="mb-4 flex items-center gap-2">
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              eyebrowColor === 'violet' || (variant === 'accent' && !eyebrowColor)
                ? 'bg-violet-400'
                : 'bg-white/40',
            )}
          />
          <span
            className={cn(
              'text-xs font-semibold uppercase tracking-[0.15em]',
              variant === 'accent' ? 'text-violet-300' : 'text-white/50',
            )}
          >
            {eyebrow}
          </span>
        </div>
      ) : null}
      {children}
    </Component>
  )
}
