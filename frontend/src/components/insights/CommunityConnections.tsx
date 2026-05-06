import { useMemo } from 'react'
import { MapPin } from 'lucide-react'
import { getVisits, getUniqueVisitedPlaces } from '@/services/local-visit-storage'
import { useInsightsData } from '@/contexts/InsightsDataContext'

interface CommunityConnectionsProps {
  hasData: boolean
}

export function CommunityConnections({ hasData }: CommunityConnectionsProps) {
  const visits = useMemo(() => getVisits(), [])
  const stats = useMemo(() => getUniqueVisitedPlaces(), [])

  const { moodEntries } = useInsightsData()
  const moodCorrelation = useMemo(() => {
    if (!hasData || visits.length === 0) return null

    const visitDates = new Set(visits.map(v => v.visitDate))
    const matchingEntries = moodEntries.filter(e => visitDates.has(e.date))

    if (matchingEntries.length === 0) return null

    const avgMood = matchingEntries.reduce((sum, e) => sum + e.mood, 0) / matchingEntries.length
    return avgMood
  }, [visits, hasData, moodEntries])

  // Don't render when no visits exist
  if (visits.length === 0) return null

  const breakdownParts: string[] = []
  if (stats.churches > 0) breakdownParts.push(`${stats.churches} church${stats.churches !== 1 ? 'es' : ''}`)
  if (stats.counselors > 0) breakdownParts.push(`${stats.counselors} counselor${stats.counselors !== 1 ? 's' : ''}`)
  if (stats.cr > 0) breakdownParts.push(`${stats.cr} CR meeting${stats.cr !== 1 ? 's' : ''}`)

  return (
    <section aria-labelledby="community-connections-heading">
      <div className="mb-3 flex items-center gap-2">
        <MapPin size={18} className="text-white/60" aria-hidden="true" />
        <h2 id="community-connections-heading" className="text-lg font-semibold text-white">
          Community Connections
        </h2>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6">
        <p className="text-base text-white">
          You&apos;ve visited <span className="font-semibold">{stats.total}</span> local support location{stats.total !== 1 ? 's' : ''}
        </p>

        {breakdownParts.length > 0 && (
          <p className="mt-1 text-sm text-white/60">
            {breakdownParts.join(', ')}
          </p>
        )}

        {moodCorrelation !== null && (
          <p className="mt-3 text-sm text-white/80">
            On days you visited local support, your mood averaged{' '}
            <span className="font-semibold">{moodCorrelation.toFixed(1)}</span>
          </p>
        )}
      </div>
    </section>
  )
}
