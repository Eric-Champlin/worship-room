import { containsCrisisKeyword, CRISIS_RESOURCES } from '@/constants/crisis-resources'

interface CrisisBannerProps {
  text: string
}

export function CrisisBanner({ text }: CrisisBannerProps) {
  if (!text || !containsCrisisKeyword(text)) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-lg border border-warning/30 bg-warning/10 p-4"
    >
      <p className="mb-2 font-semibold text-text-dark">
        If you're in crisis, help is available:
      </p>
      <ul className="space-y-1 text-sm text-text-dark">
        <li>
          <strong>{CRISIS_RESOURCES.suicide_prevention.name}:</strong>{' '}
          <a
            href="tel:988"
            className="font-semibold text-primary underline"
          >
            {CRISIS_RESOURCES.suicide_prevention.phone}
          </a>
        </li>
        <li>
          <strong>{CRISIS_RESOURCES.crisis_text.name}:</strong>{' '}
          {CRISIS_RESOURCES.crisis_text.text}
        </li>
        <li>
          <strong>{CRISIS_RESOURCES.samhsa.name}:</strong>{' '}
          <a
            href={`tel:${CRISIS_RESOURCES.samhsa.phone}`}
            className="font-semibold text-primary underline"
          >
            {CRISIS_RESOURCES.samhsa.phone}
          </a>
        </li>
      </ul>
    </div>
  )
}
