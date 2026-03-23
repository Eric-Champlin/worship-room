export const AVATAR_COLORS = ['#6B21A8', '#DC2626', '#059669', '#D97706', '#2563EB', '#DB2777']

interface MockActivityItem {
  name: string
  initials: string
  colorIndex: number
  actionTemplate: string
}

const MOCK_ACTIVITY_POOL: MockActivityItem[] = [
  { name: 'Sarah M.', initials: 'SM', colorIndex: 0, actionTemplate: 'completed Day {day}' },
  { name: 'David K.', initials: 'DK', colorIndex: 1, actionTemplate: 'shared a prayer' },
  { name: 'Maria L.', initials: 'ML', colorIndex: 2, actionTemplate: 'hit a 7-day challenge streak' },
  { name: 'James T.', initials: 'JT', colorIndex: 3, actionTemplate: 'joined the challenge' },
  { name: 'Grace P.', initials: 'GP', colorIndex: 4, actionTemplate: 'shared their milestone' },
  { name: 'Michael R.', initials: 'MR', colorIndex: 5, actionTemplate: 'completed Day {day}' },
  { name: 'Rachel H.', initials: 'RH', colorIndex: 0, actionTemplate: 'wrote a journal reflection' },
  { name: 'Daniel S.', initials: 'DS', colorIndex: 1, actionTemplate: 'completed Day {day}' },
  { name: 'Hannah B.', initials: 'HB', colorIndex: 2, actionTemplate: 'prayed for the community' },
  { name: 'Joshua W.', initials: 'JW', colorIndex: 3, actionTemplate: 'started the challenge' },
  { name: 'Emily C.', initials: 'EC', colorIndex: 4, actionTemplate: 'hit a 14-day challenge streak' },
  { name: 'Andrew F.', initials: 'AF', colorIndex: 5, actionTemplate: 'completed Day {day}' },
  { name: 'Sophia N.', initials: 'SN', colorIndex: 0, actionTemplate: 'shared a prayer' },
  { name: 'Nathan G.', initials: 'NG', colorIndex: 1, actionTemplate: 'meditated on today\'s scripture' },
  { name: 'Olivia D.', initials: 'OD', colorIndex: 2, actionTemplate: 'completed Day {day}' },
  { name: 'Caleb J.', initials: 'CJ', colorIndex: 3, actionTemplate: 'shared their progress' },
  { name: 'Abigail E.', initials: 'AE', colorIndex: 4, actionTemplate: 'hit a 21-day challenge streak' },
  { name: 'Isaac M.', initials: 'IM', colorIndex: 5, actionTemplate: 'completed Day {day}' },
  { name: 'Leah K.', initials: 'LK', colorIndex: 0, actionTemplate: 'wrote a gratitude reflection' },
  { name: 'Samuel P.', initials: 'SP', colorIndex: 1, actionTemplate: 'joined the challenge' },
]

const RELATIVE_TIMES = ['just now', '2h ago', '3h ago', '5h ago', '8h ago', '12h ago', 'yesterday', '2d ago']

export interface ActivityItem {
  name: string
  initials: string
  colorIndex: number
  action: string
  timestamp: string
}

export function getActivityItems(
  dayNumber: number,
  _challengeDuration: number,
  count = 6,
): ActivityItem[] {
  const items: ActivityItem[] = []
  for (let i = 0; i < count; i++) {
    const poolIndex = (dayNumber * 7 + i) % MOCK_ACTIVITY_POOL.length
    const item = MOCK_ACTIVITY_POOL[poolIndex]
    const nearDay = Math.max(1, dayNumber - (i % 3))
    const action = item.actionTemplate.replace('{day}', String(nearDay))
    items.push({
      name: item.name,
      initials: item.initials,
      colorIndex: item.colorIndex,
      action,
      timestamp: RELATIVE_TIMES[i % RELATIVE_TIMES.length],
    })
  }
  return items
}
