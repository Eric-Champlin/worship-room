import { useId, isValidElement, cloneElement, type ReactElement } from 'react'
import { AlertCircle } from 'lucide-react'
import { CharacterCount } from './CharacterCount'

interface FormFieldProps {
  label: string
  srOnly?: boolean
  required?: boolean
  error?: string | null
  charCount?: number
  charMax?: number
  charWarningAt?: number
  charDangerAt?: number
  charVisibleAt?: number
  helpText?: string
  children: ReactElement
  className?: string
}

export function FormField({
  label,
  srOnly = false,
  required = false,
  error,
  charCount,
  charMax,
  charWarningAt,
  charDangerAt,
  charVisibleAt,
  helpText,
  children,
  className,
}: FormFieldProps) {
  const autoId = useId()
  const childId = (isValidElement(children) && (children.props as Record<string, unknown>).id as string) || `${autoId}-input`
  const errorId = `${autoId}-error`
  const helpId = `${autoId}-help`
  const countId = `${autoId}-count`

  const describedByParts: string[] = []
  if (error) describedByParts.push(errorId)
  if (helpText) describedByParts.push(helpId)
  if (charMax != null) describedByParts.push(countId)
  const describedBy = describedByParts.length > 0 ? describedByParts.join(' ') : undefined

  const enhancedChild = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id: childId,
        'aria-describedby': describedBy,
        'aria-invalid': error ? 'true' : undefined,
      })
    : children

  return (
    <div className={className}>
      <label
        htmlFor={childId}
        className={srOnly ? 'sr-only' : 'block text-sm font-medium text-white/70 mb-1'}
      >
        {label}
        {required && (
          <>
            <span className="text-red-400 ml-0.5" aria-hidden="true">*</span>
            <span className="sr-only"> required</span>
          </>
        )}
      </label>

      {enhancedChild}

      {error && (
        <p id={errorId} role="alert" className="mt-1 flex items-center gap-1.5 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {charMax != null && charCount != null && (
        <div className="mt-1">
          <CharacterCount
            current={charCount}
            max={charMax}
            warningAt={charWarningAt}
            dangerAt={charDangerAt}
            visibleAt={charVisibleAt}
            id={countId}
          />
        </div>
      )}

      {helpText && (
        <p id={helpId} className="mt-1 text-xs text-white/60">
          {helpText}
        </p>
      )}
    </div>
  )
}
