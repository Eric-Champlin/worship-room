import {
  ButtonHTMLAttributes,
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  type ReactElement,
  type Ref,
} from 'react'
import { cn } from '@/lib/utils'
import { LoadingSpinner } from './LoadingSpinner'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'light' | 'gradient' | 'subtle'
  size?: 'sm' | 'md' | 'lg'
  /** When true, render merged styles onto the single child element instead of a <button>. */
  asChild?: boolean
  /** When true, show an inline spinner, disable interaction, and announce busy state. Ignored when `asChild` is true. */
  isLoading?: boolean
}

const SPINNER_SIZE_BY_BUTTON_SIZE: Record<NonNullable<ButtonProps['size']>, number> = {
  sm: 16,
  md: 18,
  lg: 20,
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      asChild = false,
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const merged = cn(
      'inline-flex items-center justify-center font-medium transition-[colors,transform] duration-fast motion-reduce:transition-none',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
      'disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]',
      variant !== 'light' && variant !== 'gradient' && variant !== 'subtle' && 'rounded-md',
      variant === 'light' &&
        'rounded-full bg-white text-primary hover:bg-gray-100 gap-2 font-semibold min-h-[44px]',
      variant === 'gradient' &&
        'rounded-full bg-gradient-to-br from-violet-400 to-violet-300 text-black hover:from-violet-300 hover:to-violet-200 shadow-gradient-button hover:shadow-gradient-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 focus-visible:ring-violet-300 gap-2 font-semibold min-h-[44px]',
      variant === 'subtle' &&
        'rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 gap-2 font-medium min-h-[44px]',
      {
        'bg-primary text-white hover:bg-primary-lt': variant === 'primary',
        'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary',
        'border border-primary text-primary hover:bg-primary/5': variant === 'outline',
        'text-white/80 hover:text-white hover:bg-white/5': variant === 'ghost',
        'h-9 px-3 text-sm': size === 'sm' && variant !== 'light' && variant !== 'gradient' && variant !== 'subtle',
        'h-10 px-4': size === 'md' && variant !== 'light' && variant !== 'gradient' && variant !== 'subtle',
        'h-12 px-6 text-lg': size === 'lg' && variant !== 'light' && variant !== 'gradient' && variant !== 'subtle',
        'px-4 py-2 text-sm': size === 'sm' && (variant === 'light' || variant === 'gradient' || variant === 'subtle'),
        'px-6 py-2.5 text-sm': size === 'md' && (variant === 'light' || variant === 'gradient' || variant === 'subtle'),
        'px-8 py-3 text-base': size === 'lg' && (variant === 'light' || variant === 'gradient' || variant === 'subtle'),
      },
      className,
    )

    if (asChild) {
      if (isLoading && typeof console !== 'undefined' && import.meta.env?.DEV) {
        console.warn(
          '[Button] isLoading is ignored when asChild is true — loading-state layout assumptions require a <button> host element.',
        )
      }
      const child = Children.only(children)
      if (!isValidElement(child)) {
        throw new Error('Button asChild requires a single valid React element')
      }
      const childElement = child as ReactElement<{ className?: string; ref?: Ref<unknown> }>
      return cloneElement(childElement, {
        ...props,
        className: cn(merged, childElement.props.className),
        ref,
      } as Partial<{ className?: string; ref?: Ref<unknown> }>)
    }

    if (isLoading) {
      return (
        <button
          ref={ref}
          className={cn(merged, 'relative')}
          disabled
          aria-busy
          aria-disabled
          {...props}
        >
          <span
            className="inline-flex items-center justify-center gap-2 opacity-0"
            aria-hidden="true"
          >
            {children}
          </span>
          <span className="absolute inset-0 flex items-center justify-center">
            <LoadingSpinner size={SPINNER_SIZE_BY_BUTTON_SIZE[size]} />
          </span>
        </button>
      )
    }

    return (
      <button ref={ref} className={merged} disabled={disabled} {...props}>
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'
