import { useMemo } from 'react'
import { getLiturgicalSeason } from '@/constants/liturgical-calendar'
import type { LiturgicalSeasonResult } from '@/constants/liturgical-calendar'

export function useLiturgicalSeason(dateOverride?: Date): LiturgicalSeasonResult {
  return useMemo(() => getLiturgicalSeason(dateOverride), [dateOverride])
}
