import { Link } from 'react-router-dom'
import { MiniHubCards } from './MiniHubCards'
import { cn } from '@/lib/utils'

interface CompletionScreenProps {
  title?: string
  ctas: { label: string; to: string; primary?: boolean }[]
  className?: string
}

export function CompletionScreen({
  title = 'Well done!',
  ctas,
  className,
}: CompletionScreenProps) {
  return (
    <div
      className={cn(
        'flex animate-fade-in flex-col items-center gap-8 py-12 text-center',
        className,
      )}
    >
      <h2 className="font-lora text-3xl font-bold text-text-dark">{title}</h2>

      <MiniHubCards />

      <div className="flex flex-col items-center gap-3">
        {ctas.map(({ label, to, primary }) =>
          primary ? (
            <Link
              key={to}
              to={to}
              className="rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-light"
            >
              {label}
            </Link>
          ) : (
            <Link
              key={to}
              to={to}
              className="text-sm text-primary underline transition-colors hover:text-primary-light"
            >
              {label}
            </Link>
          ),
        )}
      </div>
    </div>
  )
}
