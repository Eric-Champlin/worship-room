import { WifiOff } from 'lucide-react'
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'

interface OfflineNoticeProps {
  /** Human-readable feature name, e.g. "Prayer Wall" */
  featureName: string
  /** Offline-capable route to link the user to */
  fallbackRoute?: string
  /** CTA label for the fallback link */
  fallbackLabel?: string
}

export function OfflineNotice({
  featureName,
  fallbackRoute = '/bible',
  fallbackLabel = 'Read the Bible',
}: OfflineNoticeProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <FeatureEmptyState
        icon={WifiOff}
        heading="You're offline"
        description={`${featureName} needs an internet connection. Your saved content and the full Bible are still available offline.`}
        ctaLabel={fallbackLabel}
        ctaHref={fallbackRoute}
      />
    </div>
  )
}
